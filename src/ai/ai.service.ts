import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SimpleTaskWorkflow } from "./workflows/simple-task.workflow";
import { ChatOllama } from "@langchain/ollama";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import { TaskPriority } from "../tasks/schemas/task.schema";

export interface ParsedTaskData {
  title: string;
  description?: string;
  dueDate?: Date;
  priority: TaskPriority;
  tags: string[];
  extractedEntities: {
    people: string[];
    places: string[];
    organizations: string[];
    dates: string[];
  };
  estimatedDuration?: number; // in minutes
  confidence: number; // 0-1
}

interface ParsedResponse {
  title: string;
  description?: string;
  dueDate?: string;
  priority: string;
  tags: string[];
  extractedEntities: {
    people: string[];
    places: string[];
    organizations: string[];
    dates: string[];
  };
  estimatedDuration?: number;
  confidence: number;
}

interface ProjectInsightResponse {
  summary?: string;
  risks?: string | string[];
  suggestions?: string | string[];
  estimatedCompletion?: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly llm: ChatOllama;

  constructor(
    private configService: ConfigService,
    private taskWorkflow: SimpleTaskWorkflow,
  ) {
    this.llm = new ChatOllama({
      baseUrl:
        this.configService.get<string>("OLLAMA_BASE_URL") ||
        "http://localhost:11434",
      model: this.configService.get<string>("OLLAMA_MODEL") || "llama3.1",
      temperature: 0.3,
    });
  }

  async parseNaturalLanguageTask(input: string): Promise<ParsedTaskData> {
    this.logger.debug(`Parsing natural language input: ${input}`);

    // LangGraph 워크플로우 사용
    try {
      const workflowResult = await this.taskWorkflow.execute(input);

      return {
        title: workflowResult.title,
        description: workflowResult.description,
        dueDate: workflowResult.dueDate
          ? new Date(workflowResult.dueDate)
          : undefined,
        priority: workflowResult.priority,
        tags: workflowResult.tags || [],
        extractedEntities: workflowResult.entities || {
          people: [],
          places: [],
          organizations: [],
          dates: [],
        },
        estimatedDuration: workflowResult.estimatedDuration,
        confidence: workflowResult.confidence,
      };
    } catch (error) {
      this.logger.error(
        `LangGraph workflow failed, falling back to original method: ${error}`,
      );
      return this.parseNaturalLanguageTaskOriginal(input);
    }
  }

  // 기존 메서드를 백업으로 유지
  async parseNaturalLanguageTaskOriginal(
    input: string,
  ): Promise<ParsedTaskData> {
    this.logger.debug(`Parsing natural language input: ${input}`);

    const parser = StructuredOutputParser.fromZodSchema(
      z.object({
        title: z.string().describe("Clear, concise task title"),
        description: z
          .string()
          .optional()
          .describe("Detailed description if available"),
        dueDate: z
          .string()
          .optional()
          .describe("Due date in ISO format if mentioned"),
        priority: z
          .enum(["low", "medium", "high", "urgent"])
          .describe("Estimated task priority"),
        tags: z
          .array(z.string())
          .describe("Relevant tags extracted from context"),
        extractedEntities: z
          .object({
            people: z
              .array(z.string())
              .describe("People mentioned in the task"),
            places: z
              .array(z.string())
              .describe("Places mentioned in the task"),
            organizations: z
              .array(z.string())
              .describe("Organizations mentioned in the task"),
            dates: z.array(z.string()).describe("Dates mentioned in the task"),
          })
          .describe("Named entities extracted from the input"),
        estimatedDuration: z
          .number()
          .optional()
          .describe("Estimated duration in minutes"),
        confidence: z
          .number()
          .min(0)
          .max(1)
          .describe("Confidence score for the parsing"),
      }),
    );

    const prompt = PromptTemplate.fromTemplate(`
      You are an AI assistant specialized in parsing natural language task descriptions.
      Your job is to extract structured information from user input to create organized tasks.

      Input: "{input}"

      Instructions:
      1. Extract a clear, actionable task title
      2. Identify any mentioned due dates/deadlines
      3. Assess priority level based on urgency keywords and context
      4. Extract relevant tags that categorize the task
      5. Identify people, places, organizations, and dates mentioned
      6. Estimate how long the task might take
      7. Provide a confidence score for your parsing accuracy

      Priority guidelines:
      - "urgent", "ASAP", "emergency" → urgent
      - "important", "critical", "must do" → high
      - "when you have time", "eventually" → low
      - Default to medium if unclear

      Current date: {currentDate}

      {format_instructions}
    `);

    const chain = prompt.pipe(this.llm).pipe(parser);

    try {
      const result = (await chain.invoke({
        input,
        currentDate: new Date().toISOString(),
        format_instructions: parser.getFormatInstructions(),
      })) as ParsedResponse;

      // Convert string date to Date object if present
      const parsedResult: ParsedTaskData = {
        ...result,
        dueDate: result.dueDate ? new Date(result.dueDate) : undefined,
        priority: result.priority as TaskPriority,
      };

      this.logger.debug(`Parsed task data:`, parsedResult);
      return parsedResult;
    } catch (error) {
      this.logger.error(
        `Failed to parse natural language task: ${error instanceof Error ? error.message : String(error)}`,
      );

      // Fallback parsing
      return this.fallbackParsing(input);
    }
  }

  async suggestTaskPriority(task: {
    title: string;
    description?: string;
    dueDate?: Date;
    tags?: string[];
  }): Promise<{ priority: TaskPriority; reasoning: string }> {
    const prompt = PromptTemplate.fromTemplate(`
      Analyze the following task and suggest an appropriate priority level:

      Title: {title}
      Description: {description}
      Due Date: {dueDate}
      Tags: {tags}

      Consider:
      1. Urgency (how time-sensitive is this?)
      2. Importance (impact if not completed)
      3. Dependencies (does this block other work?)
      4. Effort required vs. deadline proximity

      Respond with one of: low, medium, high, urgent
      Then explain your reasoning in 1-2 sentences.

      Priority: 
      Reasoning:
    `);

    try {
      const result = await this.llm.invoke(
        await prompt.format({
          title: task.title,
          description: task.description || "No description provided",
          dueDate: task.dueDate?.toISOString() || "No due date",
          tags: task.tags?.join(", ") || "No tags",
        }),
      );

      const content = result.content as string;
      const lines = content.split("\n");
      const priorityLine = lines.find((line) =>
        line.toLowerCase().includes("priority:"),
      );
      const reasoningLine = lines.find((line) =>
        line.toLowerCase().includes("reasoning:"),
      );

      const priority = this.extractPriority(priorityLine || content);
      const reasoning = reasoningLine
        ? reasoningLine.replace(/reasoning:/i, "").trim()
        : "AI-suggested priority";

      return { priority, reasoning };
    } catch (error) {
      this.logger.error(
        `Failed to suggest task priority: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        priority: TaskPriority.MEDIUM,
        reasoning: "Default priority assigned",
      };
    }
  }

  async generateProjectInsights(projectData: {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    upcomingDeadlines: Date[];
    recentActivity: string[];
  }): Promise<{
    summary: string;
    risks: string[];
    suggestions: string[];
    estimatedCompletion?: Date;
  }> {
    const prompt = PromptTemplate.fromTemplate(`
      Analyze this project data and provide insights:

      Total Tasks: {totalTasks}
      Completed Tasks: {completedTasks}
      Overdue Tasks: {overdueTasks}
      Upcoming Deadlines: {upcomingDeadlines}
      Recent Activity: {recentActivity}

      Provide:
      1. A brief summary of project health
      2. Risk factors to watch
      3. Actionable suggestions for improvement
      4. Estimated completion date if possible

      Format as JSON with keys: summary, risks, suggestions, estimatedCompletion
    `);

    try {
      const result = await this.llm.invoke(
        await prompt.format({
          totalTasks: projectData.totalTasks,
          completedTasks: projectData.completedTasks,
          overdueTasks: projectData.overdueTasks,
          upcomingDeadlines: projectData.upcomingDeadlines
            .map((d) => d.toISOString())
            .join(", "),
          recentActivity: projectData.recentActivity.join(", "),
        }),
      );

      // Parse the JSON response
      const content = result.content as string;
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as ProjectInsightResponse;
        return {
          summary: parsed.summary || "Project analysis completed",
          risks: Array.isArray(parsed.risks)
            ? parsed.risks
            : ([parsed.risks].filter(Boolean) as string[]),
          suggestions: Array.isArray(parsed.suggestions)
            ? parsed.suggestions
            : ([parsed.suggestions].filter(Boolean) as string[]),
          estimatedCompletion: parsed.estimatedCompletion
            ? new Date(parsed.estimatedCompletion)
            : undefined,
        };
      }

      throw new Error("Invalid JSON response");
    } catch (error) {
      this.logger.error(
        `Failed to generate project insights: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        summary: "Unable to generate insights at this time",
        risks: [],
        suggestions: [],
      };
    }
  }

  async answerQuestion(question: string, context?: string): Promise<string> {
    const prompt = PromptTemplate.fromTemplate(`
      You are a helpful AI assistant for a task management application.
      
      ${context ? "Context: {context}" : ""}
      
      Question: {question}
      
      Provide a helpful and concise answer.
    `);

    try {
      const result = await this.llm.invoke(
        await prompt.format({
          question,
          context: context || "",
        }),
      );

      return result.content as string;
    } catch (error) {
      this.logger.error(
        `Failed to answer question: ${error instanceof Error ? error.message : String(error)}`,
      );
      return "I apologize, but I am unable to answer your question at this time.";
    }
  }

  private fallbackParsing(input: string): ParsedTaskData {
    this.logger.debug("Using fallback parsing");

    // Simple keyword-based parsing
    const title = input.length > 50 ? input.substring(0, 50) + "..." : input;

    const urgentKeywords = ["urgent", "asap", "emergency", "critical"];
    const highKeywords = ["important", "must", "need to", "required"];
    const lowKeywords = ["when possible", "eventually", "sometime"];

    let priority = TaskPriority.MEDIUM;
    const lowerInput = input.toLowerCase();

    if (urgentKeywords.some((keyword) => lowerInput.includes(keyword))) {
      priority = TaskPriority.URGENT;
    } else if (highKeywords.some((keyword) => lowerInput.includes(keyword))) {
      priority = TaskPriority.HIGH;
    } else if (lowKeywords.some((keyword) => lowerInput.includes(keyword))) {
      priority = TaskPriority.LOW;
    }

    // Extract simple entities
    const words = input.split(/\s+/);
    const tags = words
      .filter((word) => word.startsWith("#"))
      .map((tag) => tag.substring(1));

    return {
      title,
      priority,
      tags,
      extractedEntities: {
        people: [],
        places: [],
        organizations: [],
        dates: [],
      },
      confidence: 0.3, // Low confidence for fallback
    };
  }

  private extractPriority(text: string): TaskPriority {
    const lowerText = text.toLowerCase();

    if (lowerText.includes("urgent")) return TaskPriority.URGENT;
    if (lowerText.includes("high")) return TaskPriority.HIGH;
    if (lowerText.includes("low")) return TaskPriority.LOW;

    return TaskPriority.MEDIUM;
  }
}
