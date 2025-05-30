import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Ollama } from "ollama";
import { TaskPriority } from "../../common/types";

export interface WorkflowResult {
  title: string;
  description?: string;
  dueDate?: string;
  priority: TaskPriority;
  tags: string[];
  entities: {
    people: string[];
    places: string[];
    organizations: string[];
    dates: string[];
  };
  estimatedDuration?: number;
  confidence: number;
}

@Injectable()
export class SimpleTaskWorkflow {
  private readonly logger = new Logger(SimpleTaskWorkflow.name);
  private readonly ollama: Ollama;

  constructor(private configService: ConfigService) {
    this.ollama = new Ollama({
      host: this.configService.get<string>("OLLAMA_BASE_URL") || "http://localhost:11434",
    });
  }

  async execute(input: string): Promise<WorkflowResult> {
    this.logger.debug(`Starting workflow execution for: ${input}`);

    try {
      // Step 1: Extract information
      const extractedInfo = await this.extractInformation(input);
      
      // Step 2: Analyze priority
      const priorityInfo = await this.analyzePriority(extractedInfo, input);
      
      // Step 3: Finalize result
      const result = this.finalizeResult(extractedInfo, priorityInfo, input);
      
      return result;
    } catch (error) {
      this.logger.error(`Workflow execution failed: ${error instanceof Error ? error.message : String(error)}`);
      // 폴백 결과 반환
      return this.createFallbackResult(input);
    }
  }

  private async extractInformation(input: string): Promise<any> {
    this.logger.debug("Step 1: Extracting information");

    const prompt = `다음 자연어 입력에서 작업 정보를 추출해주세요:

입력: "${input}"

다음 형식으로 JSON 응답해주세요:
{
  "title": "작업 제목",
  "description": "상세 설명 (있다면)",
  "dueDate": "마감일 (YYYY-MM-DD 형식, 있다면)",
  "tags": ["태그1", "태그2"],
  "entities": {
    "people": ["사람 이름들"],
    "places": ["장소들"],
    "organizations": ["조직/회사들"], 
    "dates": ["언급된 날짜들"]
  },
  "estimatedDuration": 60
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
      this.logger.error(`Information extraction failed: ${error}`);
      return this.extractBasicInfo(input);
    }
  }

  private async analyzePriority(extractedInfo: any, originalInput: string): Promise<any> {
    this.logger.debug("Step 2: Analyzing priority");

    const prompt = `다음 작업의 우선순위를 결정해주세요:

제목: ${extractedInfo.title || originalInput}
설명: ${extractedInfo.description || "없음"}
마감일: ${extractedInfo.dueDate || "없음"}

우선순위 옵션: urgent, high, medium, low

JSON 형식으로 응답하세요:
{
  "priority": "medium",
  "reasoning": "우선순위 결정 이유",
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
      return this.analyzePriorityKeywords(originalInput);
    }
  }

  private finalizeResult(extractedInfo: any, priorityInfo: any, originalInput: string): WorkflowResult {
    this.logger.debug("Step 3: Finalizing result");

    // 날짜 파싱
    let dueDate: string | undefined;
    if (extractedInfo.dueDate) {
      try {
        const parsedDate = new Date(extractedInfo.dueDate);
        dueDate = parsedDate.toISOString();
      } catch (e) {
        dueDate = undefined;
      }
    }

    const confidence = Math.min(
      (extractedInfo.confidence || 0.7) + (priorityInfo.confidence || 0.7),
      1.0
    );

    return {
      title: extractedInfo.title || originalInput.slice(0, 50),
      description: extractedInfo.description,
      dueDate,
      priority: this.mapPriority(priorityInfo.priority || "medium"),
      tags: extractedInfo.tags || [],
      entities: extractedInfo.entities || {
        people: [],
        places: [],
        organizations: [],
        dates: [],
      },
      estimatedDuration: extractedInfo.estimatedDuration || 30,
      confidence,
    };
  }

  private parseJSON(jsonString: string): any {
    try {
      // JSON 부분만 추출
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

  private extractBasicInfo(input: string): any {
    const title = input.length > 50 ? input.slice(0, 50) + "..." : input;
    
    // 기본적인 패턴 매칭
    const datePattern = /(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|내일|다음주|next week|tomorrow)/gi;
    const tagPattern = /#(\w+)/g;
    
    const dates = input.match(datePattern) || [];
    const tags = [...input.matchAll(tagPattern)].map(match => match[1]);
    
    return {
      title,
      description: input.length > 100 ? input : undefined,
      tags,
      entities: {
        people: [],
        places: [],
        organizations: [],
        dates,
      },
      estimatedDuration: 30,
      confidence: 0.5,
    };
  }

  private analyzePriorityKeywords(text: string): any {
    const lowerText = text.toLowerCase();
    
    const urgentKeywords = ["urgent", "asap", "emergency", "critical", "긴급", "즉시", "당장"];
    const highKeywords = ["important", "must", "need to", "required", "중요", "해야", "필수"];
    const lowKeywords = ["when possible", "eventually", "sometime", "나중에", "시간될때", "여유있을때"];
    
    let priority = "medium";
    if (urgentKeywords.some(keyword => lowerText.includes(keyword))) {
      priority = "urgent";
    } else if (highKeywords.some(keyword => lowerText.includes(keyword))) {
      priority = "high";
    } else if (lowKeywords.some(keyword => lowerText.includes(keyword))) {
      priority = "low";
    }
    
    return {
      priority,
      reasoning: "키워드 기반 분석",
      confidence: 0.6,
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

  private createFallbackResult(input: string): WorkflowResult {
    const title = input.length > 50 ? input.slice(0, 50) + "..." : input;
    
    return {
      title,
      priority: TaskPriority.MEDIUM,
      tags: [],
      entities: {
        people: [],
        places: [],
        organizations: [],
        dates: [],
      },
      estimatedDuration: 30,
      confidence: 0.3,
    };
  }
}
