import { Injectable, Logger } from '@nestjs/common';
import { BaseRetriever } from '@langchain/core/retrievers';
import { Document } from '@langchain/core/documents';
import { RealDataService } from '../../retrieval/services/real-data.service';
import { MongodbService } from '../../retrieval/services/mongodb.service';
import { GeocodingService } from '../../retrieval/services/geocoding.service';
import { LocationQuery, RetrievedDocument } from '../types/rag.types';

@Injectable()
export class HybridRetriever extends BaseRetriever {
  private readonly logger = new Logger(HybridRetriever.name);

  // LangChain BaseRetriever 필수 구현
  lc_namespace = ['rag', 'retrievers', 'hybrid'];

  constructor(
    private readonly realDataService: RealDataService,
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

      // 1. 쿼리를 LocationQuery로 파싱
      const locationQuery = await this.parseQuery(query);
      this.logger.debug('파싱된 쿼리:', locationQuery);

      // 2. 좌표 변환
      if (locationQuery.searchText && !locationQuery.latitude) {
        try {
          const coordinates = await this.geocodingService.getCoordinates(
            locationQuery.searchText,
          );
          locationQuery.latitude = coordinates.latitude;
          locationQuery.longitude = coordinates.longitude;
        } catch (error) {
          this.logger.warn('좌표 변환 실패, 텍스트 검색으로 진행:', error.message);
        }
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
        try {
          const coordinates = await this.geocodingService.getCoordinates(
            locationQuery.searchText,
          );
          locationQuery.latitude = coordinates.latitude;
          locationQuery.longitude = coordinates.longitude;
        } catch (error) {
          this.logger.warn('좌표 변환 실패:', error.message);
        }
      }

      return await this.performHybridSearch(locationQuery);
    } catch (error) {
      this.logger.error('위치 기반 검색 실패:', error);
      return [];
    }
  }

  /**
   * 실제 하이브리드 검색 수행 - 실제 Elasticsearch 데이터 사용
   */
  private async performHybridSearch(
    locationQuery: LocationQuery,
  ): Promise<RetrievedDocument[]> {
    try {
      this.logger.debug('실제 Elasticsearch 데이터 검색 시작');

      // 1. RealDataService를 통한 통합 검색
      const searchResult = await this.realDataService.searchByLocation({
        location: locationQuery.searchText || '',
        latitude: locationQuery.latitude,
        longitude: locationQuery.longitude,
        radius: locationQuery.radius || 1000,
        category: locationQuery.category,
        limit: 20
      });

      const results: RetrievedDocument[] = [];

      // 2. 건물 데이터 변환
      searchResult.buildings.forEach((building, index) => {
        results.push({
          id: `building_${index}_${building.latitude}_${building.longitude}`,
          content: this.formatBuildingContent(building),
          metadata: {
            source: 'building' as const,
            category: building.purpose_category_name,
            address: `${building.dong_name} ${building.jibun}`,
            coordinates: [building.longitude, building.latitude] as [number, number],
            relevanceScore: 0.8, // 건물은 기본 점수
            distance: locationQuery.latitude && locationQuery.longitude
              ? this.geocodingService.calculateDistance(
                  locationQuery.latitude,
                  locationQuery.longitude,
                  building.latitude,
                  building.longitude,
                )
              : undefined,
          },
        });
      });

      // 3. 상가 데이터 변환
      searchResult.shops.forEach((shop, index) => {
        results.push({
          id: shop.shop_id || `shop_${index}_${shop.latitude}_${shop.longitude}`,
          content: this.formatShopContent(shop),
          metadata: {
            source: 'shop' as const,
            category: shop.category_large,
            address: shop.full_address,
            coordinates: [shop.longitude, shop.latitude] as [number, number],
            relevanceScore: this.calculateShopRelevance(shop, locationQuery),
            distance: locationQuery.latitude && locationQuery.longitude
              ? this.geocodingService.calculateDistance(
                  locationQuery.latitude,
                  locationQuery.longitude,
                  shop.latitude,
                  shop.longitude,
                )
              : undefined,
          },
        });
      });

      // 4. MongoDB 보완 검색 (필요시)
      if (results.length < 10) {
        const mongoResults = await this.searchMongoDB(locationQuery);
        results.push(...mongoResults);
      }

      // 5. 결과 정렬
      const sortedResults = this.sortResults(results, locationQuery);

      this.logger.debug(`하이브리드 검색 완료: 건물 ${searchResult.buildings.length}개, 상가 ${searchResult.shops.length}개`);

      return sortedResults.slice(0, 20);

    } catch (error) {
      this.logger.error('하이브리드 검색 수행 실패:', error);
      
      // 폴백: MongoDB 검색
      this.logger.warn('Elasticsearch 실패, MongoDB 폴백 검색 시도');
      return await this.searchMongoDB(locationQuery);
    }
  }

  /**
   * 상가 관련성 점수 계산
   */
  private calculateShopRelevance(shop: any, query: LocationQuery): number {
    let score = 1.0;

    // 카테고리 매칭 보너스
    if (query.category) {
      if (shop.category_large?.includes(query.category) ||
          shop.category_middle?.includes(query.category) ||
          shop.category_small?.includes(query.category)) {
        score += 0.5;
      }
    }

    // 상호명 키워드 매칭
    if (query.searchText && shop.name?.includes(query.searchText)) {
      score += 0.3;
    }

    // 주소 매칭
    if (query.searchText && shop.full_address?.includes(query.searchText)) {
      score += 0.2;
    }

    return Math.min(score, 2.0); // 최대 2.0점
  }

  /**
   * 건물 정보 포맷팅
   */
  private formatBuildingContent(building: any): string {
    return `건물 정보:
위치: ${building.dong_name} ${building.jibun}
용도: ${building.purpose_category_name}
좌표: 위도 ${building.latitude}, 경도 ${building.longitude}
구분: 상업용 건물
특징: ${building.purpose_category_name === '상업용' ? '창업에 적합한 상업용 건물' : '일반 건물'}`;
  }

  /**
   * 상가 정보 포맷팅
   */
  private formatShopContent(shop: any): string {
    return `상가 정보:
상호명: ${shop.name}
업종: ${shop.category_large} > ${shop.category_middle} > ${shop.category_small}
카테고리 경로: ${shop.category_path}
주소: ${shop.full_address}
위치: ${shop.dong_name}
좌표: 위도 ${shop.latitude}, 경도 ${shop.longitude}
특징: ${shop.category_large} 분야의 기존 상가`;
  }

  /**
   * MongoDB 보완 검색 (기존 코드 유지)
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
          { limit: 10 },
        );
      }

      // 지리적 검색 (좌표가 있는 경우)
      if (query.latitude && query.longitude && query.radius) {
        const nearbyShops = await this.mongodbService.findNearbyShops(
          [query.longitude, query.latitude],
          query.radius,
          { limit: 10 },
        );
        mongoResults = [...mongoResults, ...nearbyShops];
      }

      // 중복 제거
      const uniqueResults = mongoResults.filter((doc, index, arr) => 
        arr.findIndex(d => d._id.toString() === doc._id.toString()) === index
      );

      return uniqueResults.map((doc) => ({
        id: `mongo_${doc._id.toString()}`,
        content: this.formatMongoContent(doc),
        metadata: {
          source: 'shop' as const,
          category: doc.category_large,
          address: doc.full_address,
          coordinates: [doc.longitude, doc.latitude] as [number, number],
          relevanceScore: 0.7, // MongoDB 결과는 낮은 점수
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
   * 결과 정렬 (관련성 + 거리)
   */
  private sortResults(
    results: RetrievedDocument[],
    query: LocationQuery,
  ): RetrievedDocument[] {
    return results.sort((a, b) => {
      // 1차: 관련성 점수 (높은 순)
      const scoreDiff = b.metadata.relevanceScore - a.metadata.relevanceScore;

      // 2차: 거리 (가까운 순) - 점수가 비슷할 때만
      if (
        Math.abs(scoreDiff) < 0.2 &&
        a.metadata.distance !== undefined &&
        b.metadata.distance !== undefined
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
    // 간단한 파싱 로직
    const locationKeywords = [
      '역', '구', '동', '시청', '홍대', '강남', '신촌', '이태원',
      '마포구', '서울특별시', '만리재로'
    ];
    const categoryKeywords = [
      '카페', '음식점', '식당', '치킨', '피자', '햄버거', '편의점', '서점',
      '음식', '스포츠', '미용', '의료', '교육'
    ];
    const radiusKeywords = { 근처: 1000, 가까운: 500, 주변: 1500, 멀리: 2000 };

    let location = '';
    let category = '';
    let radius = 1000;

    // 위치 추출 - 더 정확한 매칭
    const fullQuery = query.toLowerCase();
    
    // 상세 주소 패턴 체크
    const addressPattern = /(서울특별시|서울시)?\s*([가-힣]+구)\s*([가-힣]+로|[가-힣]+길)?\s*(\d+)?/;
    const addressMatch = query.match(addressPattern);
    
    if (addressMatch) {
      location = addressMatch[0].trim();
    } else {
      // 기존 키워드 방식
      for (const keyword of locationKeywords) {
        if (query.includes(keyword)) {
          const match = query.match(new RegExp(`\\S*${keyword}\\S*`));
          if (match) {
            location = match[0];
            break;
          }
        }
      }
    }

    // 카테고리 추출
    for (const keyword of categoryKeywords) {
      if (fullQuery.includes(keyword)) {
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
   * MongoDB 결과를 텍스트로 포맷 (기존 유지)
   */
  private formatMongoContent(doc: any): string {
    return `상가 정보 (MongoDB):
상호명: ${doc.name || '정보없음'}
업종: ${doc.category_large || ''} > ${doc.category_middle || ''} > ${doc.category_small || ''}
주소: ${doc.full_address}
위치: ${doc.dong_name}
좌표: 위도 ${doc.latitude}, 경도 ${doc.longitude}
특징: 기존 데이터베이스 상가 정보`;
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
   * 헬스체크
   */
  async healthCheck(): Promise<boolean> {
    try {
      const [realDataHealth, mongoHealth, geoHealth] = await Promise.all([
        this.realDataService.healthCheck(),
        this.mongodbService.healthCheck(),
        this.geocodingService.healthCheck(),
      ]);

      const isHealthy = realDataHealth && mongoHealth && geoHealth;
      this.logger.debug(`하이브리드 검색 헬스체크: RealData=${realDataHealth}, Mongo=${mongoHealth}, Geo=${geoHealth}`);
      
      return isHealthy;
    } catch (error) {
      this.logger.error('하이브리드 검색 헬스체크 실패:', error);
      return false;
    }
  }
}
