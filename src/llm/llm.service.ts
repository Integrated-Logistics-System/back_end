import { Injectable, Logger } from '@nestjs/common';
import { Ollama } from '@langchain/ollama';
import { OllamaEmbeddings } from '@langchain/ollama';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);
  private readonly chatModel: Ollama;
  private readonly embeddingModel: OllamaEmbeddings;

  constructor(private readonly configService: ConfigService) {
    const baseUrl = this.configService.get<string>(
      'OLLAMA_BASE_URL',
      'http://192.168.0.111:11434',
    );
    const model = this.configService.get<string>(
      'OLLAMA_MODEL',
      'granite3.3:2b',
    );
    const embeddingModelName = this.configService.get<string>(
      'OLLAMA_EMBEDDING_MODEL',
      'granite-embedding:278m',
    );

    this.logger.log(`LLM 초기화: ${baseUrl}, 모델: ${model}`);

    this.chatModel = new Ollama({
      baseUrl,
      model,
      temperature: 0.1, // 일관성을 위해 낮은 temperature 설정
    });

    this.embeddingModel = new OllamaEmbeddings({
      baseUrl,
      model: embeddingModelName,
    });
  }

  /**
   * 채팅용 LLM 모델 반환
   */
  getChatModel(): Ollama {
    return this.chatModel;
  }

  /**
   * 임베딩용 모델 반환
   */
  getEmbeddingModel(): OllamaEmbeddings {
    return this.embeddingModel;
  }

  /**
   * 텍스트 임베딩 생성
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      this.logger.debug(`임베딩 생성: ${text.slice(0, 50)}...`);
      const embedding = await this.embeddingModel.embedQuery(text);
      return embedding;
    } catch (error) {
      this.logger.error('임베딩 생성 실패:', error);
      throw new Error('임베딩 생성에 실패했습니다.');
    }
  }

  /**
   * 직접 텍스트 생성 (체인 외부에서 사용시)
   */
  async generateText(prompt: string): Promise<string> {
    try {
      this.logger.debug(`텍스트 생성 요청: ${prompt.slice(0, 100)}...`);
      const response = await this.chatModel.invoke(prompt);
      return response.toString();
    } catch (error) {
      this.logger.error('텍스트 생성 실패:', error);
      throw new Error('텍스트 생성에 실패했습니다.');
    }
  }

  /**
   * 모델 상태 확인
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testResponse = await this.chatModel.invoke('Hello');
      return testResponse.toString().length > 0;
    } catch (error) {
      this.logger.error('LLM 헬스체크 실패:', error);
      return false;
    }
  }

  /**
   * JSON 응답 파싱 유틸리티
   */
  parseJSONResponse(response: string): any {
    try {
      // 마크다운 코드블록 제거
      const codeBlockMatch = response.match(/```(?:json)?\n?([\s\S]*?)```/i);
      const jsonString = codeBlockMatch
        ? codeBlockMatch[1].trim()
        : response.trim();

      return JSON.parse(jsonString);
    } catch (error) {
      this.logger.error('JSON 파싱 실패:', error);
      this.logger.debug('원본 응답:', response);
      throw new Error('LLM 응답을 JSON으로 파싱할 수 없습니다.');
    }
  }
}
