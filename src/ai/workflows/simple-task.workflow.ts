// LangGraph 기반 간단한 Task Creation 워크플로우
import { StateGraph, Annotation } from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";
import { PromptTemplate } from "@langchain/core/prompts";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TaskPriority } from "../../tasks/schemas/task.schema";

// 워크플로우 상태
export const TaskState = Annotation.Root({
  input: Annotation<string>,
  extractedInfo: Annotation<any>,
  priority: Annotation<TaskPriority>,
  confidence: Annotation<number>,
  needsConfirmation: Annotation<boolean>,
  result: Annotation<any>,
});

@Injectable()
export class SimpleTaskWorkflow {
  private readonly logger = new Logger(SimpleTaskWorkflow.name);
  private llm: ChatOllama;
  private graph: StateGraph<typeof TaskState.State>;

  constructor(private configService: ConfigService) {
    this.llm = new ChatOllama({
      baseUrl: this.configService.get<string>("OLLAMA_BASE_URL") || "http://localhost:11434",
      model: this.configService.get<string>("OLLAMA_MODEL") || "qwen2.5:0.5b",
      temperature: 0.3,
    });
    
    this.graph = this.buildGraph();
  }

  private buildGraph() {
    return new StateGraph(TaskState)
      .addNode("extract", this.extractInfo.bind(this))
      .addNode("prioritize", this.setPriority.bind(this))
      .addNode("validate", this.validateResult.bind(this))
      .addEdge("__start__", "extract")
      .addEdge("extract", "prioritize")
      .addEdge("prioritize", "validate")
      .addEdge("validate", "__end__")
      .compile();
  }

  private async extractInfo(state: typeof TaskState.State) {
    // Qwen 0.6B에 최적화된 간단한 프롬프트
    const prompt = `Task: "${state.input}"
    
Extract: title, dueDate (if mentioned), priority keywords
Format: title|dueDate|keywords
Example: 회의 준비|2024-06-01|urgent,important`;

    const result = await this.llm.invoke(prompt);
    const [title, dueDate, keywords] = (result.content as string).split('|');
    
    return {
      ...state,
      extractedInfo: { title: title?.trim(), dueDate: dueDate?.trim(), keywords: keywords?.trim() },
      confidence: title ? 0.8 : 0.3,
    };
  }

  private async setPriority(state: typeof TaskState.State) {
    const keywords = state.extractedInfo?.keywords || '';
    let priority = TaskPriority.MEDIUM;
    
    if (keywords.includes('urgent') || keywords.includes('emergency')) {
      priority = TaskPriority.URGENT;
    } else if (keywords.includes('important') || keywords.includes('critical')) {
      priority = TaskPriority.HIGH;
    } else if (keywords.includes('later') || keywords.includes('eventually')) {
      priority = TaskPriority.LOW;
    }
    
    return { ...state, priority };
  }

  private async validateResult(state: typeof TaskState.State) {
    const needsConfirmation = state.confidence < 0.6 || state.priority === TaskPriority.URGENT;
    
    return {
      ...state,
      needsConfirmation,
      result: {
        title: state.extractedInfo?.title || state.input,
        dueDate: state.extractedInfo?.dueDate,
        priority: state.priority,
        confidence: state.confidence,
        needsConfirmation,
      },
    };
  }

  async execute(input: string) {
    const result = await this.graph.invoke({
      input,
      extractedInfo: null,
      priority: TaskPriority.MEDIUM,
      confidence: 0,
      needsConfirmation: false,
      result: null,
    });
    
    return result.result;
  }
}
