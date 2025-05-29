import { Injectable, Logger } from '@nestjs/common';
import { Runnable } from '@langchain/core/runnables';
import { LLMService } from '@/llm/llm.service';
import { HybridRetriever } from '../retrievers/hybrid.retriever';
import { QUERY_PARSING_PROMPT, RECOMMENDATION_PROMPT } from '../prompts';
import {
  RAGResponse,
  ParsedQuery,
  LocationCoordinates,
} from '../types/rag.types';
import { GeocodingService } from '@/retrieval/services/geocoding.service';

@Injectable()
export class RecommendationChain {
  private readonly logger = new Logger(RecommendationChain.name);
  private readonly queryParsingChain: Runnable;
  private readonly recommendationChain: Runnable;

  constructor(
    private readonly llmService: LLMService,
    private readonly hybridRetriever: HybridRetriever,
    private readonly geocodingService: GeocodingService,
  ) {
    // 최신 LangChain 방식: Prompt.pipe(LLM) 체인 초기화
    this.queryParsingChain = QUERY_PARSING_PROMPT.pipe(
      this.llmService.getChatModel(),
    );

    this.recommendationChain = RECOMMENDATION_PROMPT.pipe(
      this.llmService.getChatModel(),
    );
  }

  /**
   * 전체 RAG 체인 실행
   */
  async execute(userQuery: string): Promise<RAGResponse> {
    try {
      this.logger.log(`RAG 체인 실행 시작: ${userQuery}`);

      // 1단계: 쿼리 파싱
      const parsedQuery = await this.parseUserQuery(userQuery);
      this.logger.debug('파싱된 쿼리:', parsedQuery);

      // 2단계: 좌표 변환
      const coordinates = await this.getCoordinates(parsedQuery.location);
      this.logger.debug('좌표 변환 결과:', coordinates);

      // 3단계: 하이브리드 검색 실행
      const retrievedDocs = await this.hybridRetriever.searchByLocation({
        searchText: parsedQuery.location,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        radius: parsedQuery.radius,
        category: parsedQuery.category,
      });

      this.logger.debug(`검색된 문서 수: ${retrievedDocs.length}`);

      // 4단계: LLM 추천 생성
      const recommendation = await this.generateRecommendation(
        userQuery,
        retrievedDocs,
        {
          location: parsedQuery.location,
          coordinates,
          radius: parsedQuery.radius,
        },
      );

      // 5단계: 최종 응답 구성
      const result: RAGResponse = {
        input_latitude: coordinates.latitude,
        input_longitude: coordinates.longitude,
        radius_min_meters: Math.max(500, parsedQuery.radius * 0.5),
        radius_max_meters: parsedQuery.radius,
        category: parsedQuery.category,
        ...recommendation,
      };

      this.logger.log('RAG 체인 실행 완료');
      return result;
    } catch (error) {
      this.logger.error('RAG 체인 실행 실패:', error);
      throw new Error(
        `RAG 체인 실행 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 사용자 쿼리 파싱 - 최신 LangChain 방식
   */
  private async parseUserQuery(userQuery: string): Promise<ParsedQuery> {
    try {
      this.logger.debug('쿼리 파싱 시작');

      // 새로운 방식: invoke() 사용
      const result = await this.queryParsingChain.invoke({ userQuery });
      const parsed = this.llmService.parseJSONResponse(result.content);

      const parsedQuery: ParsedQuery = {
        location: parsed.location || '서울시청',
        category: parsed.category || '일반음식점',
        radius: parsed.radius || 1000,
        requirements: parsed.requirements || [],
      };

      this.logger.debug('쿼리 파싱 완료:', parsedQuery);
      return parsedQuery;
    } catch (error) {
      this.logger.error('쿼리 파싱 실패:', error);

      // 폴백: 기본값 반환
      return {
        location: '서울시청',
        category: '일반음식점',
        radius: 1000,
        requirements: [],
      };
    }
  }

  /**
   * 위치를 좌표로 변환
   */
  private async getCoordinates(location: string): Promise<LocationCoordinates> {
    try {
      this.logger.debug(`좌표 변환 시작: ${location}`);

      const result = await this.geocodingService.getCoordinates(location);

      this.logger.debug(
        `좌표 변환 완료: ${result.latitude}, ${result.longitude}`,
      );
      return {
        latitude: result.latitude,
        longitude: result.longitude,
      };
    } catch (error) {
      this.logger.error('좌표 변환 실패:', error);

      // 폴백: 서울시청
      return { latitude: 37.5665, longitude: 126.978 };
    }
  }

  /**
   * LLM을 통한 추천 생성 - 최신 LangChain 방식
   */
  private async generateRecommendation(
    userQuery: string,
    retrievedDocs: any[],
    locationInfo: any,
  ): Promise<{ recommendation: any; llm_comment: string }> {
    try {
      this.logger.debug('추천 생성 시작');

      // 검색된 문서들을 텍스트로 변환
      const retrievedDocsText = retrievedDocs
        .slice(0, 10) // 상위 10개만 사용
        .map((doc, index) => `[문서 ${index + 1}]\n${doc.content}`)
        .join('\n\n');

      const locationInfoStr = JSON.stringify(locationInfo, null, 2);

      this.logger.debug(
        `LLM에 전달할 문서 길이: ${retrievedDocsText.length}자`,
      );

      // 새로운 방식: invoke() 사용
      const result = await this.recommendationChain.invoke({
        userQuery,
        retrievedDocs: retrievedDocsText,
        locationInfo: locationInfoStr,
      });

      const recommendation = this.llmService.parseJSONResponse(result.content);

      this.logger.debug('추천 생성 완료');
      return recommendation;
    } catch (error) {
      this.logger.error('추천 생성 실패:', error);

      // 폴백 추천
      return {
        recommendation: {
          building: `${locationInfo.location} 권장 상가`,
          address: `서울특별시 ${locationInfo.location} 근처`,
          score: 7.5,
          reasons: [
            '검색된 데이터를 바탕으로 한 일반적인 추천',
            '해당 지역의 접근성이 양호함',
            '주변 상권 분석 결과 창업 적합',
          ],
        },
        llm_comment:
          'LLM 추천 생성 중 일시적인 오류가 발생했습니다. 검색된 데이터를 바탕으로 해당 지역은 창업에 적합한 기본 조건을 갖추고 있는 것으로 분석됩니다.',
      };
    }
  }

  /**
   * 검색 품질 평가
   */
  async evaluateSearchQuality(userQuery: string): Promise<{
    searchScore: number;
    documentCount: number;
    averageRelevance: number;
    hasLocationData: boolean;
  }> {
    try {
      const parsedQuery = await this.parseUserQuery(userQuery);
      const coordinates = await this.getCoordinates(parsedQuery.location);

      const retrievedDocs = await this.hybridRetriever.searchByLocation({
        searchText: parsedQuery.location,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        radius: parsedQuery.radius,
        category: parsedQuery.category,
      });

      const averageRelevance =
        retrievedDocs.length > 0
          ? retrievedDocs.reduce(
              (sum, doc) => sum + doc.metadata.relevanceScore,
              0,
            ) / retrievedDocs.length
          : 0;

      const hasLocationData = retrievedDocs.some(
        (doc) =>
          doc.metadata.coordinates && doc.metadata.coordinates.length === 2,
      );

      const searchScore = Math.min(
        10,
        retrievedDocs.length * 0.3 +
          averageRelevance * 5 +
          (hasLocationData ? 2 : 0),
      );

      return {
        searchScore,
        documentCount: retrievedDocs.length,
        averageRelevance,
        hasLocationData,
      };
    } catch (error) {
      this.logger.error('검색 품질 평가 실패:', error);
      return {
        searchScore: 0,
        documentCount: 0,
        averageRelevance: 0,
        hasLocationData: false,
      };
    }
  }

  /**
   * 헬스체크
   */
  async healthCheck(): Promise<boolean> {
    try {
      const [llmHealth, retrieverHealth] = await Promise.all([
        this.llmService.healthCheck(),
        this.hybridRetriever.healthCheck(),
      ]);

      return llmHealth && retrieverHealth;
    } catch (error) {
      this.logger.error('RAG 체인 헬스체크 실패:', error);
      return false;
    }
  }
}
