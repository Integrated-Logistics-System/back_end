import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Ollama } from "ollama";

interface ConversationState {
  userMessage: string;
  conversationHistory: Array<{role: string; message: string; timestamp: Date}>;
  currentIntent: string;
  extractedEntities: any;
  needsClarification: boolean;
  pendingActions: string[];
  confidence: number;
  context: any;
  response?: string;
}

@Injectable()
export class ConversationalAIWorkflow {
  private readonly logger = new Logger(ConversationalAIWorkflow.name);
  private readonly ollama: Ollama;

  constructor(private configService: ConfigService) {
    this.ollama = new Ollama({
      host: this.configService.get<string>("OLLAMA_BASE_URL") || "http://localhost:11434",
    });
  }

  async processMessage(
    userMessage: string, 
    conversationHistory: any[] = [],
    context: any = {}
  ): Promise<{
    response: string;
    needsClarification: boolean;
    suggestedActions: string[];
    detectedIntent: string;
    confidence: number;
  }> {
    
    const initialState: ConversationState = {
      userMessage,
      conversationHistory,
      currentIntent: "",
      extractedEntities: {},
      needsClarification: false,
      pendingActions: [],
      confidence: 0,
      context,
    };

    try {
      // 순차적 워크플로우 실행
      let state = await this.understandIntent(initialState);
      state = await this.extractEntities(state);
      state = await this.routeAndExecute(state);
      state = await this.generateResponse(state);
      
      return {
        response: state.response || "죄송합니다. 처리 중 오류가 발생했습니다.",
        needsClarification: state.needsClarification,
        suggestedActions: state.pendingActions,
        detectedIntent: state.currentIntent,
        confidence: state.confidence,
      };
    } catch (error) {
      this.logger.error(`Conversation workflow failed: ${error}`);
      return {
        response: "죄송합니다. 요청을 처리하는 중 문제가 발생했습니다.",
        needsClarification: true,
        suggestedActions: ["다시 시도해주세요"],
        detectedIntent: "error",
        confidence: 0.1,
      };
    }
  }

  private async understandIntent(state: ConversationState): Promise<ConversationState> {
    this.logger.debug("🧠 분석 중: 사용자 의도 파악");
    
    const prompt = `다음 메시지의 의도를 분석하세요:

사용자 메시지: "${state.userMessage}"
대화 맥락: ${JSON.stringify(state.conversationHistory.slice(-3))}

JSON 응답:
{
  "intent": "task_creation|task_query|help_request|unclear",
  "confidence": 0.0-1.0,
  "reasoning": "판단 근거"
}

의도 분류 기준:
- task_creation: 새 작업 만들기, 할일 추가 등
- task_query: 기존 작업 조회, 상태 확인 등  
- help_request: 도움말, 사용법 문의 등
- unclear: 모호하거나 불분명한 요청`;

    try {
      const response = await this.ollama.generate({
        model: this.configService.get<string>("OLLAMA_MODEL") || "qwen2.5:0.5b",
        prompt,
        stream: false,
      });

      const intentResult = this.parseJSON(response.response);
      
      return {
        ...state,
        currentIntent: intentResult.intent || "unclear",
        confidence: intentResult.confidence || 0.3,
      };
    } catch (error) {
      this.logger.error(`Intent understanding failed: ${error}`);
      return {
        ...state,
        currentIntent: "unclear",
        confidence: 0.2,
      };
    }
  }

  private async extractEntities(state: ConversationState): Promise<ConversationState> {
    this.logger.debug("🔍 엔티티 추출 중");
    
    const prompt = `다음 메시지에서 작업 관련 정보를 추출하세요:

메시지: "${state.userMessage}"
의도: ${state.currentIntent}

JSON 응답:
{
  "taskTitle": "추출된 작업 제목",
  "priority": "urgent|high|medium|low",
  "dueDate": "YYYY-MM-DD 형식 또는 null",
  "assignee": "담당자 이름 또는 null", 
  "project": "프로젝트 이름 또는 null",
  "tags": ["태그1", "태그2"],
  "queryType": "list|status|search|null",
  "searchTerm": "검색어 또는 null",
  "completeness": 0.0-1.0
}`;

    try {
      const response = await this.ollama.generate({
        model: this.configService.get<string>("OLLAMA_MODEL") || "qwen2.5:0.5b",
        prompt,
        stream: false,
      });

      const entities = this.parseJSON(response.response);
      
      return {
        ...state,
        extractedEntities: entities,
        confidence: Math.min(state.confidence + (entities.completeness || 0.3), 1.0),
      };
    } catch (error) {
      this.logger.error(`Entity extraction failed: ${error}`);
      return {
        ...state,
        extractedEntities: {},
        confidence: state.confidence * 0.8,
      };
    }
  }

  private async routeAndExecute(state: ConversationState): Promise<ConversationState> {
    this.logger.debug(`🎯 라우팅: ${state.currentIntent}`);
    
    switch (state.currentIntent) {
      case "task_creation":
        return await this.executeTaskAction(state);
      case "task_query":
        return await this.executeQueryAction(state);
      case "help_request":
        return await this.provideHelp(state);
      default:
        return await this.requestClarification(state);
    }
  }

  private async executeTaskAction(state: ConversationState): Promise<ConversationState> {
    this.logger.debug("📝 작업 액션 실행");
    
    const entities = state.extractedEntities;
    const actions: string[] = [];
    
    if (entities.taskTitle) {
      actions.push(`새 작업 생성: "${entities.taskTitle}"`);
      if (entities.priority) actions.push(`우선순위: ${entities.priority}`);
      if (entities.dueDate) actions.push(`마감일: ${entities.dueDate}`);
    } else {
      return {
        ...state,
        needsClarification: true,
        pendingActions: ["작업 제목이 명확하지 않습니다. 어떤 작업을 만들어야 할까요?"]
      };
    }
    
    return {
      ...state,
      pendingActions: actions,
    };
  }

  private async executeQueryAction(state: ConversationState): Promise<ConversationState> {
    this.logger.debug("🔎 쿼리 액션 실행");
    
    const entities = state.extractedEntities;
    const actions: string[] = [];
    
    switch (entities.queryType) {
      case "list":
        actions.push("작업 목록 조회");
        break;
      case "status":  
        actions.push("작업 상태 확인");
        break;
      case "search":
        actions.push(`"${entities.searchTerm}" 검색`);
        break;
      default:
        actions.push("일반 작업 조회");
    }
    
    return {
      ...state,
      pendingActions: actions,
    };
  }

  private async requestClarification(state: ConversationState): Promise<ConversationState> {
    this.logger.debug("❓ 명확화 요청");
    
    return {
      ...state,
      needsClarification: true,
      pendingActions: [
        "더 구체적인 정보가 필요합니다",
        "어떤 종류의 작업인지 알려주세요",
        "언제까지 완료되어야 하나요?"
      ],
    };
  }

  private async provideHelp(state: ConversationState): Promise<ConversationState> {
    this.logger.debug("💡 도움말 제공");
    
    return {
      ...state,
      pendingActions: [
        "사용 가능한 명령어를 안내해드립니다",
        "작업 생성, 조회, 수정이 가능합니다",
        "자연어로 편하게 말씀해주세요"
      ],
    };
  }

  private async generateResponse(state: ConversationState): Promise<ConversationState> {
    this.logger.debug("💬 응답 생성");
    
    let response = "";
    
    if (state.needsClarification) {
      response = "조금 더 구체적으로 말씀해주세요. " + state.pendingActions.join(" ");
    } else if (state.pendingActions.length > 0) {
      response = "다음 작업을 수행하겠습니다: " + state.pendingActions.join(", ");
    } else {
      response = "요청을 처리했습니다.";
    }
    
    return {
      ...state,
      response,
    };
  }

  private parseJSON(jsonString: string): any {
    try {
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {};
    } catch (error) {
      this.logger.warn(`JSON parsing failed: ${error}`);
      return {};
    }
  }
}
