import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@/elasticsearch/elasticsearch.service';

export interface BuildingData {
  dong_name: string;
  jibun: string;
  latitude: number;
  longitude: number;
  location: {
    lat: number;
    lon: number;
  };
  purpose_category_name: string;
}

export interface ShopData {
  shop_id: string;
  name: string;
  category_large: string;
  category_middle: string;
  category_small: string;
  category_path: string;
  dong_code: string;
  dong_name: string;
  full_address: string;
  latitude: number;
  longitude: number;
  location: {
    lat: number;
    lon: number;
  };
}

export interface LocationSearchParams {
  location: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  category?: string;
  limit?: number;
}

export interface LocationSearchResult {
  buildings: BuildingData[];
  shops: ShopData[];
  total_buildings: number;
  total_shops: number;
  search_params: LocationSearchParams;
}

@Injectable()
export class RealDataService {
  private readonly logger = new Logger(RealDataService.name);

  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  /**
   * 위치 기반 통합 검색 (건물 + 상가)
   */
  async searchByLocation(params: LocationSearchParams): Promise<LocationSearchResult> {
    try {
      this.logger.debug(`위치 기반 검색 시작: ${JSON.stringify(params)}`);

      const { location, latitude, longitude, radius = 1000, category, limit = 20 } = params;

      // 병렬로 건물과 상가 검색
      const [buildingsResult, shopsResult] = await Promise.all([
        this.searchBuildings(params),
        this.searchShops(params)
      ]);

      const result: LocationSearchResult = {
        buildings: buildingsResult.buildings,
        shops: shopsResult.shops,
        total_buildings: buildingsResult.total,
        total_shops: shopsResult.total,
        search_params: params
      };

      this.logger.debug(`검색 완료: 건물 ${result.total_buildings}개, 상가 ${result.total_shops}개`);
      return result;

    } catch (error) {
      this.logger.error('위치 기반 검색 실패:', error);
      return {
        buildings: [],
        shops: [],
        total_buildings: 0,
        total_shops: 0,
        search_params: params
      };
    }
  }

  /**
   * 건물 검색
   */
  private async searchBuildings(params: LocationSearchParams): Promise<{buildings: BuildingData[], total: number}> {
    try {
      const { location, latitude, longitude, radius = 1000, limit = 10 } = params;

      let query: any;

      // 좌표가 있으면 지리적 검색, 없으면 텍스트 검색
      if (latitude && longitude) {
        query = {
          bool: {
            must: [
              {
                geo_distance: {
                  distance: `${radius}m`,
                  location: {
                    lat: latitude,
                    lon: longitude
                  }
                }
              }
            ],
            should: [
              { match: { purpose_category_name: '상업용' } },
              { match: { purpose_category_name: '근린생활시설' } }
            ]
          }
        };
      } else {
        query = {
          bool: {
            must: [
              {
                multi_match: {
                  query: location,
                  fields: ['dong_name', 'jibun'],
                  fuzziness: 'AUTO'
                }
              }
            ],
            should: [
              { match: { purpose_category_name: '상업용' } },
              { match: { purpose_category_name: '근린생활시설' } }
            ]
          }
        };
      }

      const response = await this.elasticsearchService.search({
        index: 'buildings_seoul_index',
        body: {
          query,
          size: limit,
          sort: [
            '_score',
            { 'dong_name.keyword': { order: 'asc' } }
          ]
        }
      });

      const buildings = response.hits.hits.map((hit: any) => hit._source as BuildingData);
      const total = typeof response.hits.total === 'number' ? response.hits.total : response.hits.total.value;

      this.logger.debug(`건물 검색 완료: ${total}개 중 ${buildings.length}개 반환`);

      return { buildings, total };

    } catch (error) {
      this.logger.error('건물 검색 실패:', error);
      return { buildings: [], total: 0 };
    }
  }

  /**
   * 상가 검색
   */
  private async searchShops(params: LocationSearchParams): Promise<{shops: ShopData[], total: number}> {
    try {
      const { location, latitude, longitude, radius = 1000, category, limit = 10 } = params;

      let query: any;

      if (latitude && longitude) {
        // 지리적 검색
        const mustClauses: any[] = [
          {
            geo_distance: {
              distance: `${radius}m`,
              location: {
                lat: latitude,
                lon: longitude
              }
            }
          }
        ];

        // 카테고리 필터 추가
        if (category) {
          mustClauses.push({
            bool: {
              should: [
                { match: { category_large: category } },
                { match: { category_middle: category } },
                { match: { category_small: category } },
                { match: { category_path: category } }
              ]
            }
          });
        }

        query = { bool: { must: mustClauses } };

      } else {
        // 텍스트 검색
        const mustClauses: any[] = [
          {
            multi_match: {
              query: location,
              fields: ['dong_name', 'full_address', 'name'],
              fuzziness: 'AUTO'
            }
          }
        ];

        // 카테고리 필터 추가
        if (category) {
          mustClauses.push({
            bool: {
              should: [
                { match: { category_large: category } },
                { match: { category_middle: category } },
                { match: { category_small: category } },
                { match: { category_path: category } }
              ]
            }
          });
        }

        query = { bool: { must: mustClauses } };
      }

      const response = await this.elasticsearchService.search({
        index: 'shops_seoul_index',
        body: {
          query,
          size: limit,
          sort: [
            '_score',
            { 'name.keyword': { order: 'asc' } }
          ]
        }
      });

      const shops = response.hits.hits.map((hit: any) => hit._source as ShopData);
      const total = typeof response.hits.total === 'number' ? response.hits.total : response.hits.total.value;

      this.logger.debug(`상가 검색 완료: ${total}개 중 ${shops.length}개 반환`);

      return { shops, total };

    } catch (error) {
      this.logger.error('상가 검색 실패:', error);
      return { shops: [], total: 0 };
    }
  }

  /**
   * 카테고리별 통계
   */
  async getCategoryStats(location?: string): Promise<any> {
    try {
      const query = location ? {
        multi_match: {
          query: location,
          fields: ['dong_name', 'full_address']
        }
      } : { match_all: {} };

      const response = await this.elasticsearchService.search({
        index: 'shops_seoul_index',
        body: {
          query,
          size: 0,
          aggs: {
            category_large_stats: {
              terms: {
                field: 'category_large.keyword',
                size: 20
              }
            },
            category_middle_stats: {
              terms: {
                field: 'category_middle.keyword',
                size: 50
              }
            }
          }
        }
      });

      return {
        large_categories: response.aggregations?.category_large_stats?.buckets || [],
        middle_categories: response.aggregations?.category_middle_stats?.buckets || []
      };

    } catch (error) {
      this.logger.error('카테고리 통계 조회 실패:', error);
      return { large_categories: [], middle_categories: [] };
    }
  }

  /**
   * 지역별 밀도 분석
   */
  async getAreaDensity(latitude: number, longitude: number, radius: number = 500): Promise<any> {
    try {
      const [buildingsCount, shopsCount] = await Promise.all([
        // 건물 밀도
        this.elasticsearchService.search({
          index: 'buildings_seoul_index',
          body: {
            query: {
              geo_distance: {
                distance: `${radius}m`,
                location: { lat: latitude, lon: longitude }
              }
            },
            size: 0
          }
        }),
        // 상가 밀도
        this.elasticsearchService.search({
          index: 'shops_seoul_index',
          body: {
            query: {
              geo_distance: {
                distance: `${radius}m`,
                location: { lat: latitude, lon: longitude }
              }
            },
            size: 0,
            aggs: {
              categories: {
                terms: {
                  field: 'category_large.keyword',
                  size: 10
                }
              }
            }
          }
        })
      ]);

      return {
        radius,
        center: { latitude, longitude },
        buildings_count: typeof buildingsCount.hits.total === 'number' ? buildingsCount.hits.total : buildingsCount.hits.total.value,
        shops_count: typeof shopsCount.hits.total === 'number' ? shopsCount.hits.total : shopsCount.hits.total.value,
        density_score: this.calculateDensityScore(
          typeof buildingsCount.hits.total === 'number' ? buildingsCount.hits.total : buildingsCount.hits.total.value,
          typeof shopsCount.hits.total === 'number' ? shopsCount.hits.total : shopsCount.hits.total.value,
          radius
        ),
        top_categories: shopsCount.aggregations?.categories?.buckets || []
      };

    } catch (error) {
      this.logger.error('지역 밀도 분석 실패:', error);
      return {
        radius,
        center: { latitude, longitude },
        buildings_count: 0,
        shops_count: 0,
        density_score: 0,
        top_categories: []
      };
    }
  }

  /**
   * 밀도 점수 계산 (1-10점)
   */
  private calculateDensityScore(buildingsCount: number, shopsCount: number, radius: number): number {
    // 반경 대비 상가/건물 수를 고려한 밀도 점수
    const area = Math.PI * Math.pow(radius, 2); // 원 면적 (m²)
    const areaKm2 = area / 1000000; // km² 변환
    
    const shopsDensity = shopsCount / areaKm2;
    const buildingsDensity = buildingsCount / areaKm2;
    
    // 0-10점 스케일로 변환 (경험적 임계값 사용)
    const maxShopsDensity = 1000; // km²당 상가 1000개를 10점으로 설정
    const maxBuildingsDensity = 500; // km²당 건물 500개를 10점으로 설정
    
    const shopsScore = Math.min(10, (shopsDensity / maxShopsDensity) * 10);
    const buildingsScore = Math.min(10, (buildingsDensity / maxBuildingsDensity) * 10);
    
    // 상가 가중치 70%, 건물 가중치 30%
    return Math.round((shopsScore * 0.7 + buildingsScore * 0.3) * 10) / 10;
  }

  /**
   * 헬스체크
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.elasticsearchService.clusterHealth();
      const status = response.status;
      return status === 'green' || status === 'yellow';
    } catch (error) {
      this.logger.error('Elasticsearch 헬스체크 실패:', error);
      return false;
    }
  }
}
