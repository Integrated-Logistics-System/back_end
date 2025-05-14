import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { PromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { StructuredOutputParser } from 'langchain/output_parsers';
import axios from 'axios';

/**
 * 추천 결과 인터페이스
 */
export interface Recommendation {
  name: string;
  reason: string;
  target: string;
  suggested_address: string;
}

/**
 * Ollama 서비스 - LangChain을 통해 Ollama 모델 연동
 * qwen3:1.7b 모델 사용
 */
@Injectable()
export class OllamaService implements OnModuleInit {
  private readonly logger = new Logger(OllamaService.name);
  private readonly baseUrl: string;
  private readonly modelName: string;
  private chatModel!: ChatOllama;
  private isModelReady = false;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('ollama.baseUrl') ||
      'http://localhost:11434';
    this.modelName =
      this.configService.get<string>('ollama.model') || 'qwen3:1.7b';
  }

  /**
   * 모듈 초기화 시 모델 로드 확인
   */
  async onModuleInit() {
    await this.initializeModel();
  }

  /**
   * 모델 초기화 및 연결
   */
  private async initializeModel(): Promise<void> {
    try {
      // 모델 존재 여부 확인
      await this.verifyModelExists();

      // LangChain ChatOllama 모델 초기화
      this.chatModel = new ChatOllama({
        baseUrl: this.baseUrl,
        model: this.modelName,
        temperature: 0.2, // 낮은 온도로 일관된 응답 유도
        format: 'json', // JSON 형식 응답 요청
      });

      this.isModelReady = true;
      this.logger.log(`LangChain ChatOllama model ${this.modelName} is ready`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to initialize LangChain ChatOllama model: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `Failed to initialize AI model: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Ollama 모델 존재 여부 확인 및 없으면 다운로드
   */
  private async verifyModelExists(): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/api/show`, {
        name: this.modelName,
      });
      this.logger.log(`Model ${this.modelName} exists`);
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        this.logger.log(`Model ${this.modelName} not found, downloading...`);
        await this.downloadModel();
      } else {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to verify model: ${errorMessage}`);
      }
    }
  }

  /**
   * Ollama 모델 다운로드
   */
  private async downloadModel(): Promise<void> {
    try {
      this.logger.log(`Downloading ${this.modelName}...`);
      await axios.post(`${this.baseUrl}/api/pull`, {
        name: this.modelName,
        stream: false,
      });
      this.logger.log(`Model ${this.modelName} downloaded successfully`);
    } catch (error) {
      this.logger.error(`Failed to download model ${this.modelName}`);
      throw error;
    }
  }

  /**
   * 상가 추천 기능
   * @param dongCode 동 코드
   * @param category 카테고리
   * @param existingNames 이미 있는 상점 이름 목록
   * @param limit 추천 개수
   */
  async generateRecommendations(
    dongCode: string,
    category: string,
    existingNames: string[],
    limit = 5,
  ): Promise<Recommendation[]> {
    try {
      if (!this.isModelReady) {
        await this.initializeModel();
      }

      // 출력 파서 정의
      const parser = StructuredOutputParser.fromZodSchema(
        z.array(
          z.object({
            name: z.string().describe('추천하는 상점 이름'),
            reason: z.string().describe('추천 이유'),
            target: z.string().describe('주요 대상 고객층'),
            suggested_address: z.string().describe('추천 주소 또는 위치'),
          }),
        ),
      );

      const formatInstructions = parser.getFormatInstructions();

      // 프롬프트 템플릿 생성
      const promptTemplate = PromptTemplate.fromTemplate(
        `당신은 상권 분석 전문가입니다. 다음 정보를 기반으로 새로운 추천 상점을 제안해주세요.

지역 코드: {dongCode}
카테고리: {category}
이 지역에 이미 있는 상점들: {existingNames}

이 지역에 맞는 {limit}개의 새로운 {category} 관련 상점을 추천해주세요.
추천할 때는 상점 이름, 추천 이유, 주요 타겟 고객층, 제안하는 위치를 포함해주세요.

{formatInstructions}

상점 추천 목록:`,
      );

      // 프롬프트 생성
      const prompt = await promptTemplate.format({
        dongCode,
        category,
        existingNames: existingNames.join(', '),
        limit,
        formatInstructions,
      });

      // 시스템 메시지 설정
      const systemMessage = new SystemMessage(
        '당신은 상권 분석 전문가로, JSON 형식으로만 응답해야 합니다. 프롬프트에 따라 정확한 형식의 응답을 제공하세요.',
      );

      // 모델 호출
      const response = await this.chatModel.invoke([
        systemMessage,
        new HumanMessage(prompt),
      ]);

      // 응답 파싱
      const responseContent =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);
      const result = await parser.parse(responseContent);

      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error generating recommendations: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `상가 추천 생성 실패: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 일반 텍스트 생성 (Legacy 지원)
   */
  async generateText(prompt: string): Promise<string> {
    try {
      if (!this.isModelReady) {
        await this.initializeModel();
      }

      const response = await this.chatModel.invoke([new HumanMessage(prompt)]);

      const content =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);
      return content;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error generating text: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        `텍스트 생성 실패: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
