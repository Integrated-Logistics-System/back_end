import { Injectable, Logger } from '@nestjs/common';
import { RAGService } from '../rag/rag.service';
import { BasicRAGService } from '../rag/basic-rag.service';
import { RecommendResponseDto } from './dto/recommend-response.dto';

@Injectable()
export class RecommendService {
  private readonly logger = new Logger(RecommendService.name);

  constructor(
    private readonly ragService: RAGService,
    private readonly basicRAGService: BasicRAGService, // 테스트용 백업
  ) {}

  async getRecommendations(text: string): Promise<RecommendResponseDto> {
    this.logger.log(`LangChain RAG 추천 요청: ${text}`);

    try {
      // 우선 전체 RAG 시스템 사용
      const result = await this.ragService.getLocationRecommendation(text);
      this.logger.debug(`RAG 결과: ${JSON.stringify(result, null, 2)}`);
      return result;
    } catch (error) {
      this.logger.error('RAG 추천 실패:', error);

      // 폴백: BasicRAGService 사용
      try {
        this.logger.warn('기본 RAG 서비스로 폴백 시도');
        const fallbackResult =
          await this.basicRAGService.getLocationRecommendation(text);
        return fallbackResult;
      } catch (fallbackError) {
        this.logger.error('기본 RAG 서비스도 실패:', fallbackError);
      }

      // 최종 폴백 응답
      return {
        input_latitude: 37.5665,
        input_longitude: 126.978,
        radius_min_meters: 1000,
        radius_max_meters: 3000,
        category: '일반음식점',
        recommendation: {
          building: '서울시청 인근 상가',
          address: '서울특별시 중구 태평로1가',
          score: 7.0,
          reasons: ['중심가 접근성 우수', '대중교통 편리', '유동인구 많음'],
        },
        llm_comment:
          'LangChain RAG 시스템에 일시적인 오류가 발생했습니다. 서울 중심가는 접근성이 뛰어나고 다양한 고객층을 확보할 수 있는 장점이 있습니다. 시스템 복구 후 다시 시도해주세요.',
      };
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const mainHealth = await this.ragService.healthCheck();
      const fallbackHealth = await this.basicRAGService.healthCheck();

      this.logger.log(
        `RAG 시스템 상태: ${mainHealth.status}, 기본 RAG: ${fallbackHealth}`,
      );

      return mainHealth.status === 'healthy' || fallbackHealth;
    } catch (error) {
      this.logger.error('RAG 헬스체크 실패:', error);
      return false;
    }
  }
}
