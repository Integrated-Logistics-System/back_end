import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SimpleTaskWorkflow } from "./workflows/simple-task.workflow";
import { TaskCreationWorkflow } from "./workflows/task-creation.workflow";
import { Ollama } from "ollama";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import { TaskPriority } from "../common/types";

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
  private readonly ollama: Ollama;

  constructor(
    private configService: ConfigService,
    private taskWorkflow: SimpleTaskWorkflow,
    private taskCreationWorkflow: TaskCreationWorkflow,
  ) {
    this.ollama = new Ollama({
      host: this.configService.get<string>("OLLAMA_BASE_URL") || "http://localhost:11434",
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
        dueDate: workflowResult.dueDate ? new Date(workflowResult.dueDate) : undefined,
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

  async createTaskFromNaturalLanguage(
    input: string, 
    userId: string
  ): Promise<{
    task: any;
    needsConfirmation: boolean;
    suggestions: string[];
    relatedTasks?: any[];
    conflicts?: any[];
  }> {
    this.logger.debug(`Creating task from natural language for user ${userId}: ${input}`);

    try {
      const result = await this.taskCreationWorkflow.execute(input, userId);
      
      return {
        task: result.task,
        needsConfirmation: result.needsConfirmation,
        suggestions: result.suggestions,
        relatedTasks: result.relatedTasks,
        conflicts: result.conflicts,
      };
    } catch (error) {
      this.logger.error(`Task creation workflow failed: ${error}`);
      // 폴백으로 간단한 파싱 사용
      const parsedData = await this.parseNaturalLanguageTask(input);
      
      return {
        task: {
          title: parsedData.title,
          description: parsedData.description,
          dueDate: parsedData.dueDate,
          priority: parsedData.priority,
          tags: parsedData.tags,
          estimatedDuration: parsedData.estimatedDuration,
          aiMetadata: {
            extractedEntities: parsedData.extractedEntities,
            confidence: parsedData.confidence,
            originalInput: input,
          },
        },
        needsConfirmation: parsedData.confidence < 0.6,
        suggestions: parsedData.confidence < 0.6 ? 
          ["작업 내용을 더 구체적으로 입력해주세요."] : [],
      };
    }
  }

  // 기존 메서드를 백업으로 유지
  async parseNaturalLanguageTaskOriginal(input: string): Promise<ParsedTaskData> {
    this.logger.debug(`Parsing natural language input with LangChain: ${input}`);

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

    const template = `You are an AI assistant specialized in parsing natural language task descriptions.
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

Output (JSON only):`;

    try {
      const prompt = PromptTemplate.fromTemplate(template);
      const formattedPrompt = await prompt.format({
        input,
        currentDate: new Date().toISOString(),
        format_instructions: parser.getFormatInstructions(),
      });

      const response = await this.ollama.generate({
        model: this.configService.get<string>("OLLAMA_MODEL") || "qwen2.5:0.5b",
        prompt: formattedPrompt,
        stream: false,
      });

      const result = JSON.parse(response.response) as ParsedResponse;

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
    const template = `Analyze the following task and suggest an appropriate priority level:

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

Format:
Priority: [priority]
Reasoning: [reasoning]`;

    try {
      const prompt = PromptTemplate.fromTemplate(template);
      const formattedPrompt = await prompt.format({
        title: task.title,
        description: task.description || "No description provided",
        dueDate: task.dueDate?.toISOString() || "No due date",
        tags: task.tags?.join(", ") || "No tags",
      });

      const response = await this.ollama.generate({
        model: this.configService.get<string>("OLLAMA_MODEL") || "qwen2.5:0.5b",
        prompt: formattedPrompt,
        stream: false,
      });

      const content = response.response;
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
    const template = `Analyze this project data and provide insights:

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

Format as JSON with keys: summary, risks, suggestions, estimatedCompletion`;

    try {
      const prompt = PromptTemplate.fromTemplate(template);
      const formattedPrompt = await prompt.format({
        totalTasks: projectData.totalTasks,
        completedTasks: projectData.completedTasks,
        overdueTasks: projectData.overdueTasks,
        upcomingDeadlines: projectData.upcomingDeadlines
          .map((d) => d.toISOString())
          .join(", "),
        recentActivity: projectData.recentActivity.join(", "),
      });

      const response = await this.ollama.generate({
        model: this.configService.get<string>("OLLAMA_MODEL") || "qwen2.5:0.5b",
        prompt: formattedPrompt,
        stream: false,
      });

      // Parse the JSON response
      const content = response.response;
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
    const template = `You are a helpful AI assistant for a task management application.
      
${context ? "Context: {context}" : ""}
      
Question: {question}
      
Provide a helpful and concise answer.`;

    try {
      const prompt = PromptTemplate.fromTemplate(template);
      const formattedPrompt = await prompt.format({
        question,
        context: context || "",
      });

      const response = await this.ollama.generate({
        model: this.configService.get<string>("OLLAMA_MODEL") || "qwen2.5:0.5b",
        prompt: formattedPrompt,
        stream: false,
      });

      return response.response;
    } catch (error) {
      this.logger.error(
        `Failed to answer question: ${error instanceof Error ? error.message : String(error)}`,
      );
      return "I apologize, but I am unable to answer your question at this time.";
    }
  }

  async analyzeTaskPatterns(tasks: any[]): Promise<{
    patterns: string[];
    recommendations: string[];
    insights: string[];
  }> {
    const template = `Analyze these task patterns and provide insights:

Tasks Summary:
- Total tasks: {totalTasks}
- Common priorities: {priorities}
- Common tags: {tags}
- Average completion time: {avgTime}
- Most active time periods: {timePeriods}

Provide analysis in JSON format:
{
  "patterns": ["pattern1", "pattern2"],
  "recommendations": ["rec1", "rec2"],
  "insights": ["insight1", "insight2"]
}`;

    try {
      const priorities = tasks.map(t => t.priority).join(", ");
      const tags = tasks.flatMap(t => t.tags || []).join(", ");
      
      const prompt = PromptTemplate.fromTemplate(template);
      const formattedPrompt = await prompt.format({
        totalTasks: tasks.length,
        priorities,
        tags,
        avgTime: "30 minutes", // 계산 로직 추가 가능
        timePeriods: "Morning, Afternoon",
      });

      const response = await this.ollama.generate({
        model: this.configService.get<string>("OLLAMA_MODEL") || "qwen2.5:0.5b",
        prompt: formattedPrompt,
        stream: false,
      });

      const jsonMatch = response.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        patterns: ["분석 중 오류 발생"],
        recommendations: ["나중에 다시 시도해 주세요"],
        insights: [],
      };
    } catch (error) {
      this.logger.error(`Failed to analyze task patterns: ${error}`);
      return {
        patterns: [],
        recommendations: [],
        insights: [],
      };
    }
  }

  private fallbackParsing(input: string): ParsedTaskData {
    this.logger.debug("Using fallback parsing");

    // Simple keyword-based parsing
    const title = input.length > 50 ? input.substring(0, 50) + "..." : input;

    const urgentKeywords = ["urgent", "asap", "emergency", "critical", "긴급", "즉시"];
    const highKeywords = ["important", "must", "need to", "required", "중요", "해야", "필수"];
    const lowKeywords = ["when possible", "eventually", "sometime", "나중에", "시간될때"];

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

    // 간단한 날짜 패턴 찾기
    const datePatterns = [
      /(\d{4}-\d{2}-\d{2})/g,
      /(\d{1,2}\/\d{1,2}\/\d{4})/g,
      /(내일|tomorrow)/gi,
      /(다음주|next week)/gi
    ];

    let dueDate: Date | undefined;
    const today = new Date();

    for (const pattern of datePatterns) {
      const match = input.match(pattern);
      if (match) {
        const dateStr = match[0].toLowerCase();
        if (dateStr.includes('내일') || dateStr.includes('tomorrow')) {
          dueDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        } else if (dateStr.includes('다음주') || dateStr.includes('next week')) {
          dueDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        } else if (dateStr.match(/\d/)) {
          try {
            dueDate = new Date(dateStr);
          } catch (e) {
            // 날짜 파싱 실패시 무시
          }
        }
        break;
      }
    }

    return {
      title,
      priority,
      tags,
      dueDate,
      extractedEntities: {
        people: [],
        places: [],
        organizations: [],
        dates: [],
      },
      confidence: 0.7, // 기본 신뢰도
    };
  }

  private extractPriority(text: string): TaskPriority {
    const lowerText = text.toLowerCase();

    if (lowerText.includes("urgent") || lowerText.includes("긴급")) return TaskPriority.URGENT;
    if (lowerText.includes("high") || lowerText.includes("중요")) return TaskPriority.HIGH;
    if (lowerText.includes("low") || lowerText.includes("낮음")) return TaskPriority.LOW;

    return TaskPriority.MEDIUM;
  }
}
