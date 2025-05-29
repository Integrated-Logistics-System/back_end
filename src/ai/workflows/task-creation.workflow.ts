import { StateGraph, Annotation } from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";
import { PromptTemplate } from "@langchain/core/prompts";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TaskPriority } from "../../tasks/schemas/task.schema";

// 워크플로우 상태 정의
export const TaskCreationState = Annotation.Root({
  // 입력
  input: Annotation<string>,
  userId: Annotation<string>,
  
  // 추출된 정보
  extractedInfo: Annotation<{
    title: string;
    description?: string;
    dueDate?: string;
    tags: string[];
    entities: {
      people: string[];
      places: string[];
      dates: string[];
    };
    estimatedDuration?: number;
  } | null>,
  
  // 분석 결과
  priority: Annotation<TaskPriority>,
  priorityReasoning: Annotation<string>,
  
  // 컨텍스트 정보
  relatedTasks: Annotation<any[]>,
  scheduleConflicts: Annotation<any[]>,
  
  // 결과
  confidence: Annotation<number>,
  needsUserConfirmation: Annotation<boolean>,
  suggestions: Annotation<string[]>,
  finalResult: Annotation<any>,
});

@Injectable()
export class TaskCreationWorkflow {
  private readonly logger = new Logger(TaskCreationWorkflow.name);
  private llm: ChatOllama;
  private graph: StateGraph<typeof TaskCreationState.State>;

  constructor(private configService: ConfigService) {
    this.llm = new ChatOllama({
      baseUrl: this.configService.get<string>("OLLAMA_BASE_URL") || "http://localhost:11434",
      model: this.configService.get<string>("OLLAMA_MODEL") || "qwen2.5:0.5b",
      temperature: 0.3,
    });
    
    this.graph = this.buildGraph();
  }
  private buildGraph() {
    const workflow = new StateGraph(TaskCreationState)
      // 1단계: 정보 추출 (핵심)
      .addNode("extract_info", this.extractTaskInfo.bind(this))
      
      // 2단계: 우선순위 분석 (병렬)
      .addNode("analyze_priority", this.analyzePriority.bind(this))
      
      // 3단계: 관련 작업 검색 (병렬) 
      .addNode("find_related", this.findRelatedTasks.bind(this))
      
      // 4단계: 충돌 감지
      .addNode("detect_conflicts", this.detectConflicts.bind(this))
      
      // 5단계: 최종 검증 및 제안
      .addNode("validate_and_suggest", this.validateAndSuggest.bind(this))

      // 워크플로우 정의
      .addEdge("__start__", "extract_info")
      
      // 정보 추출 후 병렬 처리
      .addEdge("extract_info", "analyze_priority")
      .addEdge("extract_info", "find_related")
      
      // 병렬 처리 완료 후 충돌 감지
      .addEdge("analyze_priority", "detect_conflicts")
      .addEdge("find_related", "detect_conflicts")
      
      // 최종 검증
      .addEdge("detect_conflicts", "validate_and_suggest")
      .addEdge("validate_and_suggest", "__end__");

    return workflow.compile();
  }
  // 1단계: 자연어에서 구조화된 정보 추출
  private async extractTaskInfo(state: typeof TaskCreationState.State) {
    this.logger.debug(`Extracting info from: ${state.input}`);
    
    const prompt = PromptTemplate.fromTemplate(`
      Extract structured information from this natural language task input.
      Keep it simple and practical for a task management app.

      Input: "{input}"
      Current date: {currentDate}

      Extract the following in JSON format:
      - title: Clear, concise task title
      - description: Brief description if available
      - dueDate: ISO date if mentioned
      - tags: Array of relevant hashtags/categories
      - entities: Object with people, places, dates arrays
      - estimatedDuration: Duration in minutes if mentioned

      Example output:
      {{
        "title": "회의 준비하기",
        "description": "프로젝트 진행상황 검토 자료 준비",
        "dueDate": "2024-06-01T09:00:00Z",
        "tags": ["회의", "준비", "프로젝트"],
        "entities": {{
          "people": ["김팀장"],
          "places": ["회의실A"],
          "dates": ["내일"]
        }},
        "estimatedDuration": 60
      }}

      Return only valid JSON:
    `);

    try {
      const result = await this.llm.invoke(
        await prompt.format({
          input: state.input,
          currentDate: new Date().toISOString(),
        })
      );

      const extractedInfo = this.parseJSON(result.content as string);
      const confidence = this.calculateConfidence(extractedInfo, state.input);

      return {
        ...state,
        extractedInfo,
        confidence,
      };
    } catch (error) {
      this.logger.error(`Info extraction failed: ${error}`);
      
      // 폴백: 기본 정보 추출
      return {
        ...state,
        extractedInfo: {
          title: state.input.length > 50 ? state.input.substring(0, 50) + "..." : state.input,
          tags: [],
          entities: { people: [], places: [], dates: [] },
        },
        confidence: 0.3,
      };
    }
  }
