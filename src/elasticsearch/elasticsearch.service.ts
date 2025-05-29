import { Client } from '@elastic/elasticsearch';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ElasticsearchService {
  private readonly logger = new Logger(ElasticsearchService.name);
  private client: Client;

  constructor(private readonly configService: ConfigService) {
    const esHost = this.configService.get<string>('ELASTICSEARCH_HOST', 'http://192.168.0.111:9200');
    
    this.client = new Client({ 
      node: esHost,
      requestTimeout: 30000,
      maxRetries: 3,
    });

    this.logger.log(`Elasticsearch 클라이언트 초기화: ${esHost}`);
  }

  /**
   * 검색 실행
   */
  async search(params: any) {
    try {
      const response = await this.client.search(params);
      return response;
    } catch (error) {
      this.logger.error('Elasticsearch 검색 실패:', error);
      throw error;
    }
  }

  /**
   * 인덱스 존재 확인
   */
  async indexExists(index: string): Promise<boolean> {
    try {
      const response = await this.client.indices.exists({ index });
      return response;
    } catch (error) {
      this.logger.error(`인덱스 존재 확인 실패 (${index}):`, error);
      return false;
    }
  }

  /**
   * 문서 개수 조회
   */
  async count(params: any) {
    try {
      const response = await this.client.count(params);
      return response;
    } catch (error) {
      this.logger.error('문서 개수 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 매핑 정보 조회
   */
  async getMapping(index: string) {
    try {
      const response = await this.client.indices.getMapping({ index });
      return response;
    } catch (error) {
      this.logger.error(`매핑 조회 실패 (${index}):`, error);
      throw error;
    }
  }

  /**
   * 클러스터 상태 확인
   */
  async clusterHealth() {
    try {
      const response = await this.client.cluster.health();
      return response;
    } catch (error) {
      this.logger.error('클러스터 상태 확인 실패:', error);
      throw error;
    }
  }

  /**
   * 지리적 거리 검색
   */
  async geoDistanceSearch(params: {
    index: string;
    latitude: number;
    longitude: number;
    distance: string;
    locationField?: string;
    query?: any;
    size?: number;
    sort?: any[];
  }) {
    const {
      index,
      latitude,
      longitude,
      distance,
      locationField = 'location',
      query,
      size = 10,
      sort = []
    } = params;

    const searchBody: any = {
      query: {
        bool: {
          must: [
            {
              geo_distance: {
                distance,
                [locationField]: {
                  lat: latitude,
                  lon: longitude
                }
              }
            }
          ]
        }
      },
      size,
      sort: [
        {
          _geo_distance: {
            [locationField]: {
              lat: latitude,
              lon: longitude
            },
            order: 'asc',
            unit: 'm'
          }
        },
        ...sort
      ]
    };

    // 추가 쿼리가 있으면 병합
    if (query) {
      searchBody.query.bool.must.push(query);
    }

    return this.search({
      index,
      body: searchBody
    });
  }

  /**
   * 멀티 매치 검색
   */
  async multiMatchSearch(params: {
    index: string;
    query: string;
    fields: string[];
    fuzziness?: string;
    size?: number;
    filters?: any[];
  }) {
    const {
      index,
      query: searchQuery,
      fields,
      fuzziness = 'AUTO',
      size = 10,
      filters = []
    } = params;

    const searchBody: any = {
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query: searchQuery,
                fields,
                fuzziness
              }
            }
          ]
        }
      },
      size
    };

    // 필터 추가
    if (filters.length > 0) {
      searchBody.query.bool.filter = filters;
    }

    return this.search({
      index,
      body: searchBody
    });
  }

  /**
   * 집계 검색
   */
  async aggregationSearch(params: {
    index: string;
    query?: any;
    aggregations: any;
    size?: number;
  }) {
    const {
      index,
      query = { match_all: {} },
      aggregations,
      size = 0
    } = params;

    return this.search({
      index,
      body: {
        query,
        aggs: aggregations,
        size
      }
    });
  }

  /**
   * 하이브리드 검색 (텍스트 + 지리적)
   */
  async hybridSearch(params: {
    index: string;
    textQuery?: string;
    textFields?: string[];
    latitude?: number;
    longitude?: number;
    distance?: string;
    locationField?: string;
    filters?: any[];
    size?: number;
  }) {
    const {
      index,
      textQuery,
      textFields = ['*'],
      latitude,
      longitude,
      distance = '1000m',
      locationField = 'location',
      filters = [],
      size = 10
    } = params;

    const mustClauses: any[] = [];

    // 텍스트 검색 추가
    if (textQuery) {
      mustClauses.push({
        multi_match: {
          query: textQuery,
          fields: textFields,
          fuzziness: 'AUTO'
        }
      });
    }

    // 지리적 검색 추가
    if (latitude !== undefined && longitude !== undefined) {
      mustClauses.push({
        geo_distance: {
          distance,
          [locationField]: {
            lat: latitude,
            lon: longitude
          }
        }
      });
    }

    const searchBody: any = {
      query: {
        bool: {
          must: mustClauses
        }
      },
      size
    };

    // 필터 추가
    if (filters.length > 0) {
      searchBody.query.bool.filter = filters;
    }

    // 지리적 정렬 (좌표가 있는 경우)
    if (latitude !== undefined && longitude !== undefined) {
      searchBody.sort = [
        {
          _geo_distance: {
            [locationField]: {
              lat: latitude,
              lon: longitude
            },
            order: 'asc',
            unit: 'm'
          }
        }
      ];
    }

    return this.search({
      index,
      body: searchBody
    });
  }

  /**
   * 클라이언트 직접 접근 (고급 사용자용)
   */
  getClient(): Client {
    return this.client;
  }

  /**
   * 헬스체크
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.clusterHealth();
      const status = response.status;
      return status === 'green' || status === 'yellow';
    } catch (error) {
      this.logger.error('Elasticsearch 헬스체크 실패:', error);
      return false;
    }
  }

  /**
   * 인덱스 통계
   */
  async getIndexStats(index: string) {
    try {
      const [countResponse, mappingResponse] = await Promise.all([
        this.count({ index }),
        this.getMapping(index)
      ]);

      return {
        documentCount: countResponse.count,
        mapping: mappingResponse[index]?.mappings?.properties || {},
        fields: Object.keys(mappingResponse[index]?.mappings?.properties || {})
      };
    } catch (error) {
      this.logger.error(`인덱스 통계 조회 실패 (${index}):`, error);
      return {
        documentCount: 0,
        mapping: {},
        fields: []
      };
    }
  }
}
