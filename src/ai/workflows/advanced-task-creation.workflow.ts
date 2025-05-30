import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Ollama } from "ollama";
import { TaskPriority } from "../../common/types";

// 간단한 상태 기반 워크플로우 (LangGraph 스타일)
export interface TaskCreationState {
  input: string;
  userId: string;
  extractedInfo?: any;
  priorityAnalysis?: any;
  validationResult?: any;
  needsHumanReview: boolean;
  conflicts: any[];
  suggestions: string[];
  finalTask?: any;
  confidence: number;
  currentStep: string;
}

export interface TaskCreationResult {
  task: any;
  needsConfirmation: boolean;
  suggestions: string[];
  relatedTasks?: any[];
  conflicts?: any[];
  confidence: number;
  workflowPath: string[];
}

@Injectable()
export class AdvancedTaskCreationWorkflow {
  private readonly logger = new Logger(AdvancedTaskCreationWorkflow.name);
  private readonly ollama: Ollama;

  constructor(private configService: ConfigService) {
    this.ollama = new Ollama({
      host: this.configService.get<string>("OLLAMA_BASE_URL") || "http://localhost:11434",
    });
  }

  async execute(input: string, userId: string): Promise<TaskCreationResult> {
    this.logger.debug(`🚀 Starting advanced workflow for: ${input}`);

    const initialState: TaskCreationState = {
      input,
      userId,
      needsHumanReview: false,
      conflicts: [],
      suggestions: [],
      confidence: 0,
      currentStep: "starting",
    };

    try {
      // 단계별 워크플로우 실행
      let state = await this.extractInformation(initialState);
      state = await this.analyzePriority(state);
      state = await this.detectConflicts(state);
      state = await this.validateAndFinalize(state);

      return {
        task: state.finalTask,
        needsConfirmation: state.needsHumanReview,
        suggestions: state.suggestions,
        conflicts: state.conflicts,
        confidence: state.confidence,
        workflowPath: [state.currentStep],
      };
    } catch (error) {
      this.logger.error(`Advanced workflow failed: ${error}`);
      
      return {
        task: this.createBasicTask(input),
        needsConfirmation: true,
        suggestions: ["작업 생성 중 오류가 발생했습니다. 내용을 다시 확인해주세요."],
        conflicts: [],
        confidence: 0.3,
        workflowPath: ["error"],
      };
    }
  }

  private async extractInformation(state: TaskCreationState): Promise<TaskCreationState> {
    this.logger.debug("📝 Step 1: Extracting detailed information");
    
    const prompt = `작업 정보를 상세히 추출하세요:
입력: "${state.input}"

JSON 형식으로 응답:
{
  "title": "명확한 작업 제목",
  "description": "상세 설명",
  "complexity": 1-5,
  "urgencyKeywords": ["발견된 긴급성 키워드들"],
  "entities": {"people": [], "dates": [], "places": []},
  "estimatedDuration": 분단위숫자,
  "confidence": 0.0-1.0
}`;

    try {
      const response = await this.ollama.generate({
        model: this.configService.get<string>("OLLAMA_MODEL") || "qwen2.5:0.5b",
        prompt,
        stream: false,
      });

      const extractedInfo = this.parseJSON(response.response);
      
      return {
        ...state,
        extractedInfo,
        confidence: extractedInfo.confidence || 0.5,
        currentStep: "information_extracted"
      };
    } catch (error) {
      this.logger.error(`Information extraction failed: ${error}`);
      return {
        ...state,
        extractedInfo: { 
          title: state.input, 
          confidence: 0.2,
          complexity: 2,
          estimatedDuration: 30
        },
        confidence: 0.2,
        currentStep: "extraction_failed"
      };
    }
  }

  private async analyzePriority(state: TaskCreationState): Promise<TaskCreationState> {
    this.logger.debug("⚡ Step 2: Analyzing priority");
    
    const info = state.extractedInfo;
    const prompt = `작업 우선순위를 분석하세요:

작업: ${info.title}
복잡도: ${info.complexity}
긴급성 키워드: ${info.urgencyKeywords?.join(", ")}
예상 소요시간: ${info.estimatedDuration}분

JSON 응답:
{
  "priority": "urgent|high|medium|low", 
  "reasoning": "근거",
  "riskLevel": "high|medium|low",
  "confidence": 0.0-1.0
}`;

    try {
      const response = await this.ollama.generate({
        model: this.configService.get<string>("OLLAMA_MODEL") || "qwen2.5:0.5b",
        prompt,
        stream: false,
      });

      const priorityAnalysis = this.parseJSON(response.response);
      
      return {
        ...state,
        priorityAnalysis,
        confidence: Math.min(state.confidence + (priorityAnalysis.confidence || 0.3), 1.0),
        currentStep: "priority_analyzed"
      };
    } catch (error) {
      this.logger.error(`Priority analysis failed: ${error}`);
      return {
        ...state,
        priorityAnalysis: { 
          priority: "medium", 
          confidence: 0.3,
          riskLevel: "medium"
        },
        currentStep: "priority_analysis_failed"
      };
    }
  }

  private async detectConflicts(state: TaskCreationState): Promise<TaskCreationState> {
    this.logger.debug("🔍 Step 3: Detecting conflicts");
    
    const conflicts: any[] = [];
    const suggestions = [...state.suggestions];

    // 복잡도 기반 충돌 감지
    if (state.extractedInfo?.complexity >= 4) {
      conflicts.push({
        type: "complexity",
        message: "매우 복잡한 작업입니다",
        severity: "high"
      });
      suggestions.push("작업을 여러 단계로 나누는 것을 권장합니다");
    }

    // 소요시간 기반 충돌 감지  
    if (state.extractedInfo?.estimatedDuration > 240) {
      conflicts.push({
        type: "duration", 
        message: "장시간 소요 작업입니다",
        severity: "medium"
      });
      suggestions.push("다른 작업들과의 스케줄 조정이 필요할 수 있습니다");
    }

    // 우선순위-복잡도 불일치 감지
    if (state.priorityAnalysis?.priority === "urgent" && state.extractedInfo?.complexity >= 4) {
      conflicts.push({
        type: "priority_complexity_mismatch",
        message: "긴급하지만 복잡한 작업입니다", 
        severity: "high"
      });
      suggestions.push("리소스 확보 또는 범위 축소를 고려하세요");
    }

    return {
      ...state,
      conflicts,
      suggestions,
      currentStep: "conflicts_detected"
    };
  }

  private async validateAndFinalize(state: TaskCreationState): Promise<TaskCreationState> {
    this.logger.debug("✅ Step 4: Validating and finalizing");
    
    let needsHumanReview = false;
    const suggestions = [...state.suggestions];

    // 신뢰도 기반 확인 필요성 판단
    if (state.confidence < 0.6) {
      needsHumanReview = true;
      suggestions.push("작업 내용을 더 구체적으로 작성해주세요.");
    }

    // 긴급 작업이지만 신뢰도가 낮은 경우
    if (state.priorityAnalysis?.priority === "urgent" && state.confidence < 0.8) {
      needsHumanReview = true;
      suggestions.push("긴급한 작업입니다. 내용을 다시 확인해주세요.");
    }

    // 마감일이 없는 중요한 작업
    if (state.priorityAnalysis?.priority === "high" && !state.extractedInfo?.dueDate) {
      suggestions.push("중요한 작업입니다. 마감일을 설정하는 것을 권장합니다.");
    }

    // 충돌이 있는 경우
    if (state.conflicts.some(c => c.severity === "high")) {
      needsHumanReview = true;
      suggestions.push("고위험 요소가 감지되었습니다. 검토가 필요합니다.");
    }

    // 최종 작업 객체 생성
    const finalTask = {
      title: state.extractedInfo?.title || state.input,
      description: state.extractedInfo?.description,
      priority: this.mapPriority(state.priorityAnalysis?.priority || "medium"),
      estimatedDuration: state.extractedInfo?.estimatedDuration || 30,
      tags: state.extractedInfo?.tags || [],
      dueDate: state.extractedInfo?.dueDate ? new Date(state.extractedInfo.dueDate) : undefined,
      aiMetadata: {
        extractedEntities: state.extractedInfo?.entities || {},
        suggestedPriority: state.priorityAnalysis?.priority,
        priorityReasoning: state.priorityAnalysis?.reasoning,
        complexity: state.extractedInfo?.complexity,
        riskLevel: state.priorityAnalysis?.riskLevel,
        confidence: state.confidence,
        workflowVersion: "advanced-v2",
        processedSteps: state.currentStep,
        urgencyIndicators: state.extractedInfo?.urgencyKeywords || [],
      },
    };

    return {
      ...state,
      finalTask,
      needsHumanReview,
      suggestions,
      currentStep: "finalized"
    };
  }

  private parseJSON(jsonString: string): any {
    try {
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error("No JSON found");
    } catch (error) {
      this.logger.warn(`JSON parsing failed: ${error}`);
      return {};
    }
  }

  private mapPriority(priority: string): TaskPriority {
    switch (priority?.toLowerCase()) {
      case "urgent": return TaskPriority.URGENT;
      case "high": return TaskPriority.HIGH; 
      case "low": return TaskPriority.LOW;
      default: return TaskPriority.MEDIUM;
    }
  }

  private createBasicTask(input: string): any {
    return {
      title: input.length > 50 ? input.slice(0, 50) + "..." : input,
      description: input,
      priority: TaskPriority.MEDIUM,
      tags: [],
      estimatedDuration: 30,
      aiMetadata: {
        extractedEntities: {},
        confidence: 0.3,
        fallback: true,
      },
    };
  }
}
