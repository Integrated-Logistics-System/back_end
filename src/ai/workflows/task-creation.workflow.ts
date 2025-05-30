import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Ollama } from "ollama";
import { TaskPriority } from "../../common/types";

export interface TaskCreationResult {
  task: any;
  needsConfirmation: boolean;
  suggestions: string[];
  relatedTasks?: any[];
  conflicts?: any[];
  confidence: number;
}

@Injectable()
export class TaskCreationWorkflow {
  private readonly logger = new Logger(TaskCreationWorkflow.name);
  private readonly ollama: Ollama;

  constructor(private configService: ConfigService) {
    this.ollama = new Ollama({
      host: this.configService.get<string>("OLLAMA_BASE_URL") || "http://localhost:11434",
    });
  }

  async execute(input: string, userId: string): Promise<TaskCreationResult> {
    this.logger.debug(`Starting task creation workflow for user ${userId}: ${input}`);

    try {
      // Step 1: Extract detailed information
      const extractedInfo = await this.extractDetailedInformation(input);
      
      // Step 2: Analyze priority and complexity
      const analysis = await this.analyzeTaskComplexity(extractedInfo, input);
      
      // Step 3: Generate suggestions and check for conflicts
      const validation = this.validateAndSuggest(extractedInfo, analysis);
      
      return validation;
    } catch (error) {
      this.logger.error(`Task creation workflow failed: ${error instanceof Error ? error.message : String(error)}`);
      
      // 폴백 결과
      return {
        task: this.createBasicTask(input),
        needsConfirmation: true,
        suggestions: ["작업 생성 중 오류가 발생했습니다. 내용을 다시 확인해주세요."],
        confidence: 0.3,
      };
    }
  }

  private async extractDetailedInformation(input: string): Promise<any> {
    this.logger.debug("Step 1: Extracting detailed task information");

    const prompt = `다음 자연어 입력을 분석하여 상세한 작업 정보를 추출해주세요:

입력: "${input}"

다음 요소들을 추출하고 JSON으로 응답하세요:
- 작업 제목 (명확하고 실행 가능한)
- 상세 설명
- 마감일 (언급되었다면)
- 예상 소요 시간 (분 단위)
- 관련 태그
- 언급된 사람, 장소, 조직
- 작업의 긴급성 지표
- 복잡도 수준 (1-5)

응답 형식:
{
  "title": "구체적인 작업 제목",
  "description": "상세 설명",
  "dueDate": "YYYY-MM-DD",
  "estimatedDuration": 60,
  "tags": ["태그1", "태그2"],
  "entities": {
    "people": ["이름들"],
    "places": ["장소들"],
    "organizations": ["조직들"]
  },
  "urgencyIndicators": ["긴급성을 나타내는 키워드들"],
  "complexity": 3,
  "dependencies": ["필요한 전제 조건들"]
}

JSON만 응답하세요:`;

    try {
      const response = await this.ollama.generate({
        model: this.configService.get<string>("OLLAMA_MODEL") || "qwen2.5:0.5b",
        prompt,
        stream: false,
      });

      const result = this.parseJSON(response.response);
      return {
        ...result,
        confidence: this.calculateExtractionConfidence(result, input),
      };
    } catch (error) {
      this.logger.error(`Information extraction failed: ${error}`);
      return this.fallbackExtraction(input);
    }
  }

  private async analyzeTaskComplexity(extractedInfo: any, originalInput: string): Promise<any> {
    this.logger.debug("Step 2: Analyzing task complexity and priority");

    const prompt = `다음 작업의 우선순위와 복잡도를 분석해주세요:

작업: ${extractedInfo.title}
설명: ${extractedInfo.description || "없음"}
마감일: ${extractedInfo.dueDate || "없음"}
복잡도: ${extractedInfo.complexity || "미정"}
긴급성 지표: ${extractedInfo.urgencyIndicators?.join(", ") || "없음"}

우선순위 결정 기준:
1. 시간 민감도 (마감일, 긴급성 키워드)
2. 비즈니스 영향도 (중요성, 의존성)
3. 리소스 요구사항 (복잡도, 예상 시간)

JSON 형식으로 응답:
{
  "priority": "urgent|high|medium|low",
  "reasoning": "우선순위 결정 근거",
  "riskFactors": ["위험 요소들"],
  "recommendedTimeSlot": "최적 수행 시간대",
  "confidence": 0.8
}

JSON만 응답하세요:`;

    try {
      const response = await this.ollama.generate({
        model: this.configService.get<string>("OLLAMA_MODEL") || "qwen2.5:0.5b",
        prompt,
        stream: false,
      });

      return this.parseJSON(response.response);
    } catch (error) {
      this.logger.error(`Priority analysis failed: ${error}`);
      return this.fallbackPriorityAnalysis(extractedInfo);
    }
  }

  private validateAndSuggest(extractedInfo: any, analysis: any): TaskCreationResult {
    this.logger.debug("Step 3: Validating and generating suggestions");

    let needsConfirmation = false;
    const suggestions: string[] = [];
    const conflicts: any[] = [];

    // 신뢰도 기반 확인 필요성 판단
    const overallConfidence = Math.min(
      (extractedInfo.confidence || 0.5) + (analysis.confidence || 0.5),
      1.0
    );

    if (overallConfidence < 0.6) {
      needsConfirmation = true;
      suggestions.push("작업 내용을 더 구체적으로 작성해주세요.");
    }

    // 긴급 작업이지만 신뢰도가 낮은 경우
    if (analysis.priority === "urgent" && overallConfidence < 0.8) {
      needsConfirmation = true;
      suggestions.push("긴급한 작업입니다. 내용을 다시 확인해주세요.");
    }

    // 마감일이 없는 중요한 작업
    if (analysis.priority === "high" && !extractedInfo.dueDate) {
      suggestions.push("중요한 작업입니다. 마감일을 설정하는 것을 권장합니다.");
    }

    // 복잡한 작업에 대한 제안
    if (extractedInfo.complexity >= 4) {
      suggestions.push("복잡한 작업입니다. 하위 작업으로 나누는 것을 고려해보세요.");
    }

    // 리소스 충돌 검사
    if (extractedInfo.estimatedDuration > 240) { // 4시간 이상
      conflicts.push({
        type: "resource",
        message: "장시간 소요 작업으로 다른 작업에 영향을 줄 수 있습니다.",
        suggestion: "작업을 여러 단계로 나누는 것을 고려해보세요.",
      });
      needsConfirmation = true;
    }

    // 최종 작업 객체 생성
    const finalTask = {
      title: extractedInfo.title,
      description: extractedInfo.description,
      dueDate: extractedInfo.dueDate ? new Date(extractedInfo.dueDate) : undefined,
      priority: this.mapPriority(analysis.priority),
      tags: extractedInfo.tags || [],
      estimatedDuration: extractedInfo.estimatedDuration || 30,
      aiMetadata: {
        extractedEntities: extractedInfo.entities || {
          people: [],
          places: [],
          organizations: [],
          dates: [],
        },
        suggestedPriority: analysis.priority,
        priorityReasoning: analysis.reasoning,
        complexity: extractedInfo.complexity,
        riskFactors: analysis.riskFactors || [],
        confidence: overallConfidence,
        urgencyIndicators: extractedInfo.urgencyIndicators || [],
      },
    };

    return {
      task: finalTask,
      needsConfirmation,
      suggestions,
      conflicts,
      confidence: overallConfidence,
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
      this.logger.warn(`JSON parsing failed: ${error}, raw response: ${jsonString}`);
      return {};
    }
  }

  private calculateExtractionConfidence(extractedInfo: any, originalInput: string): number {
    let confidence = 0.5; // 기본 신뢰도

    // 제목이 명확한지 확인
    if (extractedInfo.title && extractedInfo.title.length > 5) {
      confidence += 0.2;
    }

    // 상세 설명이 있는지 확인
    if (extractedInfo.description && extractedInfo.description.length > 10) {
      confidence += 0.1;
    }

    // 마감일이 명시되었는지 확인
    if (extractedInfo.dueDate) {
      confidence += 0.1;
    }

    // 태그나 카테고리가 식별되었는지 확인
    if (extractedInfo.tags && extractedInfo.tags.length > 0) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  private fallbackExtraction(input: string): any {
    return {
      title: input.length > 50 ? input.slice(0, 50) + "..." : input,
      description: input.length > 100 ? input : undefined,
      tags: [],
      entities: {
        people: [],
        places: [],
        organizations: [],
      },
      urgencyIndicators: [],
      complexity: 2,
      estimatedDuration: 30,
      confidence: 0.3,
    };
  }

  private fallbackPriorityAnalysis(info: any): any {
    const text = (info.title + " " + (info.description || "")).toLowerCase();
    
    let priority = "medium";
    if (text.includes("urgent") || text.includes("긴급") || text.includes("asap")) {
      priority = "urgent";
    } else if (text.includes("important") || text.includes("중요") || text.includes("critical")) {
      priority = "high";
    } else if (text.includes("later") || text.includes("나중에") || text.includes("when possible")) {
      priority = "low";
    }

    return {
      priority,
      reasoning: "키워드 기반 분석",
      riskFactors: [],
      recommendedTimeSlot: "업무 시간",
      confidence: 0.5,
    };
  }

  private mapPriority(priority: string): TaskPriority {
    switch (priority?.toLowerCase()) {
      case "urgent":
        return TaskPriority.URGENT;
      case "high":
        return TaskPriority.HIGH;
      case "low":
        return TaskPriority.LOW;
      default:
        return TaskPriority.MEDIUM;
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
        extractedEntities: {
          people: [],
          places: [],
          organizations: [],
          dates: [],
        },
        confidence: 0.3,
        fallback: true,
      },
    };
  }
}
