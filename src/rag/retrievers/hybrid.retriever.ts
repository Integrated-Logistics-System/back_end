import { Injectable, Logger } from '@nestjs/common';
import { BaseRetriever } from '@langchain/core/retrievers';
import { Document } from '@langchain/core/documents';
// import { EnhancedElasticsearchService } from '../../retrieval/services/enhanced-elasticsearch.service'; // 임시 비활성화
import { MongodbService } from '../../retrieval/services/mongodb.service';
import { GeocodingService } from '../../retrieval/services/geocoding.service';
import { LocationQuery, RetrievedDocument } from '../types/rag.types';

@Injectable()
export class HybridRetriever extends BaseRetriever {
  private readonly logger = new Logger(HybridRetriever.name);

  // LangChain BaseRetriever 필수 구현
  lc_namespace = ['rag', 'retrievers', 'hybrid'];

  constructor(
    // private readonly elasticsearchService: EnhancedElasticsearchService, // 임시 비활성화
    private readonly mongodbService: MongodbService,
    private readonly geocodingService: GeocodingService,
  ) {
    super();
  }

  /**
   * LangChain BaseRetriever 인터페이스 구현
   */
  async _getRelevantDocuments(query: string): Promise<Document[]> {
    try {
      this.logger.log(`하이브리드 검색 시작: ${query}`);

      // 1. 쿼리를 LocationQuery로 파싱 (간단한 키워드 추출)
      const locationQuery = await this.parseQuery(query);
      this.logger.debug('파싱된 쿼리:', locationQuery);

      // 2. 좌표 변환
      if (locationQuery.searchText && !locationQuery.latitude) {
        const coordinates = await this.geocodingService.getCoordinates(
          locationQuery.searchText,
        );
        locationQuery.latitude = coordinates.latitude;
        locationQuery.longitude = coordinates.longitude;
      }

      // 3. 하이브리드 검색 실행
      const retrievedDocs = await this.performHybridSearch(locationQuery);

      // 4. LangChain Document 형식으로 변환
      const documents = this.convertToLangChainDocuments(retrievedDocs);

      this.logger.log(`검색 완료: ${documents.length}개 문서`);
      return documents;
    } catch (error) {
      this.logger.error('하이브리드 검색 실패:', error);
      return [];
    }
  }

  /**
   * 직접적인 위치 기반 검색 (컨트롤러에서 직접 호출 가능)
   */
  async searchByLocation(
    locationQuery: LocationQuery,
  ): Promise<RetrievedDocument[]> {
    try {
      this.logger.log(`위치 기반 검색: ${JSON.stringify(locationQuery)}`);

      // 좌표가 없으면 지오코딩
      if (!locationQuery.latitude && locationQuery.searchText) {
        const coordinates = await this.geocodingService.getCoordinates(
          locationQuery.searchText,
        );
        locationQuery.latitude = coordinates.latitude;
        locationQuery.longitude = coordinates.longitude;
      }

      return await this.performHybridSearch(locationQuery);
    } catch (error) {
      this.logger.error('위치 기반 검색 실패:', error);
      return [];
    }
  }

  /**
   * 실제 하이브리드 검색 수행 (임시 MongoDB만 사용)
   */
  private async performHybridSearch(
    locationQuery: LocationQuery,
  ): Promise<RetrievedDocument[]> {
    const results: RetrievedDocument[] = [];

    try {
      // 1. Elasticsearch 검색 (임시 비활성화)
      // const esResults = await this.searchElasticsearch(locationQuery);
      // results.push(...esResults);

      // 2. MongoDB 검색 (기본)
      const mongoResults = await this.searchMongoDB(locationQuery);

      // 3. 결과 병합 및 중복 제거 (현재는 MongoDB만)
      const mergedResults = mongoResults; // this.mergeAndDeduplicateResults(results, mongoResults);

      // 4. 관련성 및 거리 기준 정렬
      const sortedResults = this.sortResults(mergedResults, locationQuery);

      // 5. 상위 결과만 반환
      return sortedResults.slice(0, 20);
    } catch (error) {
      this.logger.error('하이브리드 검색 수행 실패:', error);
      return [];
    }
  }

  /**
   * Elasticsearch 검색 (임시 비활성화)
   */
  private async searchElasticsearch(
    query: LocationQuery,
  ): Promise<RetrievedDocument[]> {
    // 임시 비활성화
    this.logger.debug('Elasticsearch 검색 임시 비활성화');
    return [];

    /* 기존 코드 - 나중에 사용
    try {
      const searchParams = {
        latitude: query.latitude!,
        longitude: query.longitude!,
        radius: query.radius || 1000,
        searchText: query.searchText,
        category: query.category,
      };

      const esResults = await this.elasticsearchService.hybridSearch(searchParams, {
        maxResults: 30,
        sortBy: 'distance'
      });

      return esResults.map((hit) => ({
        id: hit.id,
        content: this.formatElasticsearchContent(hit.source),
        metadata: {
          source: hit.index.includes('shops') ? 'shop' as const : 'building' as const,
          category: hit.source.category_large || hit.source.purpose_category_name,
          address: hit.source.full_address || `${hit.source.dong_name} ${hit.source.jibun}`,
          coordinates: [hit.source.longitude, hit.source.latitude] as [number, number],
          relevanceScore: hit.score,
          distance: hit.distance,
        }
      }));
      
    } catch (error) {
      this.logger.error('Elasticsearch 검색 실패:', error);
      return [];
    }
    */
  }

  /**
   * MongoDB 검색 (보완적 역할)
   */
  private async searchMongoDB(
    query: LocationQuery,
  ): Promise<RetrievedDocument[]> {
    try {
      let mongoResults: any[] = [];

      // 텍스트 기반 검색
      if (query.searchText) {
        mongoResults = await this.mongodbService.searchShopsByText(
          query.searchText,
          { limit: 15 },
        );
      }

      // 지리적 검색 (좌표가 있는 경우)
      if (query.latitude && query.longitude && query.radius) {
        const nearbyShops = await this.mongodbService.findNearbyShops(
          [query.longitude, query.latitude],
          query.radius,
          { limit: 15 },
        );
        mongoResults = [...mongoResults, ...nearbyShops];
      }

      return mongoResults.map((doc) => ({
        id: doc._id.toString(),
        content: this.formatMongoContent(doc),
        metadata: {
          source: 'shop' as const,
          category: doc.category_large,
          address: doc.full_address,
          coordinates: [doc.longitude, doc.latitude] as [number, number],
          relevanceScore: 1.0,
          distance:
            query.latitude && query.longitude
              ? this.geocodingService.calculateDistance(
                  query.latitude,
                  query.longitude,
                  doc.latitude,
                  doc.longitude,
                )
              : undefined,
        },
      }));
    } catch (error) {
      this.logger.error('MongoDB 검색 실패:', error);
      return [];
    }
  }

  /**
   * 결과 병합 및 중복 제거
   */
  private mergeAndDeduplicateResults(
    esResults: RetrievedDocument[],
    mongoResults: RetrievedDocument[],
  ): RetrievedDocument[] {
    const merged = [...esResults];
    const existingIds = new Set(esResults.map((r) => r.id));

    // MongoDB 결과 중 중복되지 않는 것만 추가
    for (const result of mongoResults) {
      if (!existingIds.has(result.id)) {
        merged.push(result);
      }
    }

    return merged;
  }

  /**
   * 결과 정렬 (관련성 + 거리)
   */
  private sortResults(
    results: RetrievedDocument[],
    query: LocationQuery,
  ): RetrievedDocument[] {
    return results.sort((a, b) => {
      // 1차: 관련성 점수
      const scoreDiff = b.metadata.relevanceScore - a.metadata.relevanceScore;

      // 2차: 거리 (가까운 순)
      if (
        Math.abs(scoreDiff) < 0.1 &&
        a.metadata.distance &&
        b.metadata.distance
      ) {
        return a.metadata.distance - b.metadata.distance;
      }

      return scoreDiff;
    });
  }

  /**
   * 쿼리 파싱 (간단한 키워드 추출)
   */
  private async parseQuery(query: string): Promise<LocationQuery> {
    // 간단한 파싱 로직 (실제로는 LLM을 사용할 수 있음)
    const locationKeywords = [
      '역',
      '구',
      '동',
      '시청',
      '홍대',
      '강남',
      '신촌',
      '이태원',
    ];
    const categoryKeywords = [
      '카페',
      '음식점',
      '식당',
      '치킨',
      '피자',
      '햄버거',
      '편의점',
      '서점',
    ];
    const radiusKeywords = { 근처: 1000, 가까운: 500, 주변: 1500 };

    let location = '';
    let category = '';
    let radius = 1000;

    // 위치 추출
    for (const keyword of locationKeywords) {
      if (query.includes(keyword)) {
        const match = query.match(new RegExp(`\\S*${keyword}\\S*`));
        if (match) {
          location = match[0];
          break;
        }
      }
    }

    // 카테고리 추출
    for (const keyword of categoryKeywords) {
      if (query.includes(keyword)) {
        category = keyword;
        break;
      }
    }

    // 반경 추출
    for (const [keyword, meters] of Object.entries(radiusKeywords)) {
      if (query.includes(keyword)) {
        radius = meters;
        break;
      }
    }

    return {
      searchText: location || query,
      category,
      radius,
    };
  }

  /**
   * Elasticsearch 결과를 텍스트로 포맷
   */
  private formatElasticsearchContent(source: any): string {
    if (source.name) {
      // 상가 정보
      return `상호명: ${source.name}
업종: ${source.category_large || ''} > ${source.category_middle || ''} > ${source.category_small || ''}
주소: ${source.full_address}
위치: ${source.dong_name}
좌표: ${source.latitude}, ${source.longitude}`;
    } else {
      // 건물 정보
      return `건물 위치: ${source.dong_name} ${source.jibun}
용도: ${source.purpose_category_name}
좌표: ${source.latitude}, ${source.longitude}`;
    }
  }

  /**
   * MongoDB 결과를 텍스트로 포맷
   */
  private formatMongoContent(doc: any): string {
    return `상호명: ${doc.name || '정보없음'}
업종: ${doc.category_large || ''} > ${doc.category_middle || ''} > ${doc.category_small || ''}
주소: ${doc.full_address}
위치: ${doc.dong_name}
좌표: ${doc.latitude}, ${doc.longitude}`;
  }

  /**
   * LangChain Document 형식으로 변환
   */
  private convertToLangChainDocuments(
    results: RetrievedDocument[],
  ): Document[] {
    return results.map(
      (result) =>
        new Document({
          pageContent: result.content,
          metadata: result.metadata,
        }),
    );
  }

  /**
   * 헬스체크 (임시 MongoDB만 확인)
   */
  async healthCheck(): Promise<boolean> {
    try {
      const [mongoHealth, geoHealth] = await Promise.all([
        // this.elasticsearchService.healthCheck(), // 임시 비활성화
        this.mongodbService.healthCheck(),
        this.geocodingService.healthCheck(),
      ]);

      return mongoHealth && geoHealth;
    } catch (error) {
      this.logger.error('하이브리드 검색 헬스체크 실패:', error);
      return false;
    }
  }
}
