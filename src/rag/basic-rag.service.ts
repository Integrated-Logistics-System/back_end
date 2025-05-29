import { Injectable, Logger } from '@nestjs/common';
import { Runnable } from '@langchain/core/runnables';
import { LLMService } from '@/llm/llm.service';
import { QUERY_PARSING_PROMPT, RECOMMENDATION_PROMPT } from './prompts';
import {
  RAGResponse,
  ParsedQuery,
  LocationCoordinates,
} from './types/rag.types';

@Injectable()
export class BasicRAGService {
  private readonly logger = new Logger(BasicRAGService.name);
  private readonly queryParsingChain: Runnable;
  private readonly recommendationChain: Runnable;

  constructor(private readonly llmService: LLMService) {
    // 최신 LangChain 방식: Prompt.pipe(LLM) 체인 초기화
    this.queryParsingChain = QUERY_PARSING_PROMPT.pipe(
      this.llmService.getChatModel(),
    );

    this.recommendationChain = RECOMMENDATION_PROMPT.pipe(
      this.llmService.getChatModel(),
    );
  }

  /**
   * 기본 RAG 추천 실행 (검색 기능 없이 테스트용)
   */
  async getLocationRecommendation(userQuery: string): Promise<RAGResponse> {
    try {
      this.logger.log(`RAG 추천 시작: ${userQuery}`);

      // 1단계: 사용자 쿼리 파싱
      const parsedQuery = await this.parseUserQuery(userQuery);
      this.logger.debug('파싱된 쿼리:', parsedQuery);

      // 2단계: 좌표 변환 (임시로 기본 좌표 사용)
      const coordinates = this.getDefaultCoordinates(parsedQuery.location);
      this.logger.debug('좌표:', coordinates);

      // 3단계: 임시 데이터로 추천 생성 (실제 검색 대신)
      const mockRetrievedDocs = this.getMockRetrievedDocs(parsedQuery);

      // 4단계: LLM 추천 생성
      const recommendation = await this.generateRecommendation(
        userQuery,
        mockRetrievedDocs,
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

      this.logger.log('RAG 추천 완료');
      return result;
    } catch (error) {
      this.logger.error('RAG 추천 실패:', error);
      throw new Error(
        `RAG 추천 처리 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 사용자 쿼리를 파싱하여 구조화된 데이터로 변환 - 최신 LangChain 방식
   */
  private async parseUserQuery(userQuery: string): Promise<ParsedQuery> {
    try {
      // 새로운 방식: invoke() 사용
      const result = await this.queryParsingChain.invoke({ userQuery });

      // 다양한 응답 형태 처리
      let responseText: string;
      if (typeof result === 'string') {
        responseText = result;
      } else if (result?.content) {
        responseText = result.content;
      } else if (result?.text) {
        responseText = result.text;
      } else if (result?.toString) {
        responseText = result.toString();
      } else {
        throw new Error(`예상되지 않은 응답 형태: ${JSON.stringify(result)}`);
      }

      const parsed = this.llmService.parseJSONResponse(responseText);

      return {
        location: parsed.location || '서울시청',
        category: parsed.category || '일반음식점',
        radius: parsed.radius || 1000,
        requirements: parsed.requirements || [],
      };
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
   * 위치명을 좌표로 변환 (임시 구현)
   */
  private getDefaultCoordinates(location: string): LocationCoordinates {
    const locationMap: Record<string, LocationCoordinates> = {
      강남역: { latitude: 37.497952, longitude: 127.027619 },
      홍대입구역: { latitude: 37.557192, longitude: 126.925381 },
      신촌역: { latitude: 37.555946, longitude: 126.936893 },
      마포구: { latitude: 37.560284, longitude: 126.908755 },
      '서울특별시 마포구 만리재로 23': {
        latitude: 37.560284,
        longitude: 126.908755,
      },
      '마포구 만리재로 23': { latitude: 37.560284, longitude: 126.908755 },
      '마포구 만리재로': { latitude: 37.560284, longitude: 126.908755 },
      서울시청: { latitude: 37.5665, longitude: 126.978 },
    };

    // 부분 매칭 시도 (상세 주소 처리)
    const matchedKey = Object.keys(locationMap).find(
      (key) => location.includes(key) || key.includes(location),
    );

    return matchedKey ? locationMap[matchedKey] : locationMap['서울시청'];
  }

  /**
   * 임시 검색 데이터 생성 (실제 Elasticsearch/MongoDB 검색 대신)
   */
  private getMockRetrievedDocs(parsedQuery: ParsedQuery): string {
    const mockDocs = [
      {
        name: `${parsedQuery.location} 상가 A동`,
        category: parsedQuery.category,
        address: `서울특별시 강남구 ${parsedQuery.location} 인근`,
        features: ['지하철 도보 3분', '유동인구 많음', '주차 가능'],
      },
      {
        name: `${parsedQuery.location} 빌딩 B`,
        category: '복합상가',
        address: `서울특별시 강남구 ${parsedQuery.location} 근처`,
        features: ['1층 상가', '접근성 우수', '임대료 적정'],
      },
      {
        name: `${parsedQuery.location} 상권`,
        category: '상업지역',
        address: `${parsedQuery.location} 일대`,
        features: ['직장인 밀집', '점심시간 붐빔', '저녁 유동인구'],
      },
    ];

    return mockDocs
      .map(
        (doc) =>
          `상호명: ${doc.name}\n업종: ${doc.category}\n주소: ${doc.address}\n특징: ${doc.features.join(', ')}`,
      )
      .join('\n\n');
  }

  /**
   * LLM을 통한 추천 생성 - 최신 LangChain 방식
   */
  private async generateRecommendation(
    userQuery: string,
    retrievedDocs: string,
    locationInfo: any,
  ): Promise<{ recommendation: any; llm_comment: string }> {
    try {
      const locationInfoStr = JSON.stringify(locationInfo);

      // 새로운 방식: invoke() 사용
      const result = await this.recommendationChain.invoke({
        userQuery,
        retrievedDocs,
        locationInfo: locationInfoStr,
      });

      // 다양한 응답 형태 처리
      let responseText: string;
      if (typeof result === 'string') {
        responseText = result;
      } else if (result?.content) {
        responseText = result.content;
      } else if (result?.text) {
        responseText = result.text;
      } else if (result?.toString) {
        responseText = result.toString();
      } else {
        throw new Error(`예상되지 않은 응답 형태: ${JSON.stringify(result)}`);
      }

      return this.llmService.parseJSONResponse(responseText);
    } catch (error) {
      this.logger.error('추천 생성 실패:', error);

      // 폴백 추천
      return {
        recommendation: {
          building: `${locationInfo.location} 추천 상가`,
          address: `서울특별시 ${locationInfo.location} 인근`,
          score: 7.0,
          reasons: [
            '접근성이 양호함',
            '유동인구가 적정 수준',
            '주변 상권과 시너지 효과 기대',
          ],
        },
        llm_comment:
          '일시적인 오류로 기본 추천을 제공합니다. 해당 지역은 창업에 적합한 기본 조건을 갖추고 있습니다.',
      };
    }
  }

  /**
   * 헬스체크
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.llmService.healthCheck();
      return true;
    } catch {
      return false;
    }
  }
}
