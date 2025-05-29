import { Injectable, Logger } from '@nestjs/common';
import { RecommendationChain } from './chains/recommendation.chain';
import { RAGResponse } from './types/rag.types';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class RAGService {
  private readonly logger = new Logger(RAGService.name);

  constructor(
    private readonly recommendationChain: RecommendationChain,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 위치 기반 창업 자리 추천 (캐싱 포함)
   */
  async getLocationRecommendation(userQuery: string): Promise<RAGResponse> {
    const startTime = Date.now();

    try {
      this.logger.log(`RAG 추천 요청: ${userQuery}`);

      // 1. 캐시 확인
      const cacheKey = this.cacheService.createRAGCacheKey(userQuery);
      const cachedResult =
        await this.cacheService.getJSON<RAGResponse>(cacheKey);

      if (cachedResult) {
        const cacheTime = Date.now() - startTime;
        this.logger.log(`캐시에서 결과 반환 (${cacheTime}ms): ${userQuery}`);
        return cachedResult;
      }

      // 2. RAG 체인 실행
      const result = await this.recommendationChain.execute(userQuery);

      // 3. 결과 캐싱
      await this.cacheService.setJSON(cacheKey, result, 300); // 5분 캐싱

      const totalTime = Date.now() - startTime;
      this.logger.log(`RAG 추천 완료 (${totalTime}ms): ${userQuery}`);

      return result;
    } catch (error) {
      const errorTime = Date.now() - startTime;
      this.logger.error(`RAG 추천 실패 (${errorTime}ms):`, error);
      throw error;
    }
  }

  /**
   * 배치 추천 (여러 쿼리 동시 처리)
   */
  async getBatchRecommendations(userQueries: string[]): Promise<RAGResponse[]> {
    this.logger.log(`배치 RAG 추천 요청: ${userQueries.length}개`);

    const results: RAGResponse[] = [];

    // 동시에 처리하되 과부하 방지를 위해 청크 단위로 처리
    const chunkSize = 3;
    for (let i = 0; i < userQueries.length; i += chunkSize) {
      const chunk = userQueries.slice(i, i + chunkSize);

      const chunkResults = await Promise.allSettled(
        chunk.map((query) => this.getLocationRecommendation(query)),
      );

      for (const result of chunkResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          this.logger.error('배치 처리 중 오류:', result.reason);
          // 오류 시 기본 응답 추가
          results.push(this.createFallbackResponse());
        }
      }

      // 다음 청크 처리 전 잠시 대기 (API 과부하 방지)
      if (i + chunkSize < userQueries.length) {
        await this.sleep(100);
      }
    }

    this.logger.log(`배치 RAG 추천 완료: ${results.length}개 결과`);
    return results;
  }

  /**
   * 검색 품질 분석
   */
  async analyzeSearchQuality(userQuery: string): Promise<{
    quality: 'excellent' | 'good' | 'fair' | 'poor';
    score: number;
    details: any;
    recommendations: string[];
  }> {
    try {
      const evaluation =
        await this.recommendationChain.evaluateSearchQuality(userQuery);

      let quality: 'excellent' | 'good' | 'fair' | 'poor';
      const recommendations: string[] = [];

      if (evaluation.searchScore >= 8) {
        quality = 'excellent';
      } else if (evaluation.searchScore >= 6) {
        quality = 'good';
      } else if (evaluation.searchScore >= 4) {
        quality = 'fair';
        recommendations.push('더 구체적인 지역명을 사용해보세요');
        recommendations.push('업종을 명확히 지정해보세요');
      } else {
        quality = 'poor';
        recommendations.push('검색어를 다시 입력해보세요');
        recommendations.push('지역명과 업종을 모두 포함해보세요');
        recommendations.push('예: "강남역 근처 카페 추천"');
      }

      if (evaluation.documentCount < 5) {
        recommendations.push('검색 범위를 더 넓혀보세요');
      }

      if (!evaluation.hasLocationData) {
        recommendations.push('정확한 지역명을 사용해보세요');
      }

      return {
        quality,
        score: evaluation.searchScore,
        details: evaluation,
        recommendations,
      };
    } catch (error) {
      this.logger.error('검색 품질 분석 실패:', error);
      return {
        quality: 'poor',
        score: 0,
        details: {},
        recommendations: ['시스템 오류로 분석할 수 없습니다'],
      };
    }
  }

  /**
   * 유사한 추천 결과 찾기
   */
  async findSimilarRecommendations(
    userQuery: string,
    limit: number = 5,
  ): Promise<RAGResponse[]> {
    try {
      // 간단한 구현: 캐시에서 유사한 키워드를 가진 결과들 찾기
      const keywords = this.extractKeywords(userQuery);
      const similarResults: RAGResponse[] = [];

      // 실제 구현에서는 벡터 유사도 검색을 사용할 수 있음
      for (const keyword of keywords) {
        const testQueries = [
          `${keyword} 추천`,
          `${keyword} 창업`,
          `${keyword} 상가`,
        ];

        for (const testQuery of testQueries) {
          const cacheKey = this.cacheService.createRAGCacheKey(testQuery);
          const cached = await this.cacheService.getJSON<RAGResponse>(cacheKey);

          if (cached && similarResults.length < limit) {
            similarResults.push(cached);
          }
        }
      }

      return similarResults;
    } catch (error) {
      this.logger.error('유사 추천 찾기 실패:', error);
      return [];
    }
  }

  /**
   * 캐시 통계 및 성능 정보
   */
  async getPerformanceStats(): Promise<{
    cacheStats: any;
    chainHealth: boolean;
    averageResponseTime?: number;
  }> {
    try {
      const [cacheStats, chainHealth] = await Promise.all([
        this.cacheService.getStats(),
        this.recommendationChain.healthCheck(),
      ]);

      return {
        cacheStats,
        chainHealth,
        // 평균 응답 시간은 실제로는 별도 메트릭 수집이 필요
        averageResponseTime: 2500, // 임시값
      };
    } catch (error) {
      this.logger.error('성능 통계 조회 실패:', error);
      return {
        cacheStats: {},
        chainHealth: false,
      };
    }
  }

  /**
   * 캐시 관리
   */
  async clearCache(pattern?: string): Promise<number> {
    try {
      if (pattern) {
        return await this.cacheService.delPattern(pattern);
      } else {
        // RAG 관련 캐시만 삭제
        const ragPattern = 'rag:*';
        return await this.cacheService.delPattern(ragPattern);
      }
    } catch (error) {
      this.logger.error('캐시 삭제 실패:', error);
      return 0;
    }
  }

  /**
   * 헬스체크
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: {
      chain: boolean;
      cache: boolean;
    };
    timestamp: string;
  }> {
    try {
      const [chainHealth, cacheHealth] = await Promise.all([
        this.recommendationChain.healthCheck(),
        this.cacheService.healthCheck(),
      ]);

      let status: 'healthy' | 'degraded' | 'unhealthy';

      if (chainHealth && cacheHealth) {
        status = 'healthy';
      } else if (chainHealth || cacheHealth) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      return {
        status,
        components: {
          chain: chainHealth,
          cache: cacheHealth,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('RAG 헬스체크 실패:', error);
      return {
        status: 'unhealthy',
        components: {
          chain: false,
          cache: false,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 폴백 응답 생성
   */
  private createFallbackResponse(): RAGResponse {
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
        '시스템 오류로 기본 추천을 제공합니다. 서울 중심가는 접근성이 뛰어나고 다양한 고객층을 확보할 수 있는 장점이 있습니다.',
    };
  }

  /**
   * 키워드 추출 (간단한 구현)
   */
  private extractKeywords(text: string): string[] {
    const keywords = text
      .replace(/[^\w\s가-힣]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length >= 2)
      .slice(0, 5);

    return [...new Set(keywords)]; // 중복 제거
  }

  /**
   * 지연 함수
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
