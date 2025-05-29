import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService as BaseElasticsearchService } from '@nestjs/elasticsearch';
// import { SearchResponse } from '@elasticsearch/elasticsearch/api/types'; // 타입 문제로 주석 처리

export interface ElasticsearchSearchOptions {
  maxResults?: number;
  includeHighlights?: boolean;
  fuzzyMatch?: boolean;
  sortBy?: 'relevance' | 'distance';
}

export interface GeoSearchParams {
  latitude: number;
  longitude: number;
  radius: number; // meters
  searchText?: string;
  category?: string;
}

@Injectable()
export class EnhancedElasticsearchService {
  private readonly logger = new Logger(EnhancedElasticsearchService.name);

  constructor(
    private readonly elasticsearchService: BaseElasticsearchService,
  ) {}

  /**
   * 하이브리드 검색: 텍스트 + 지리적 위치 + 카테고리
   */
  async hybridSearch(
    params: GeoSearchParams,
    options: ElasticsearchSearchOptions = {},
  ): Promise<any[]> {
    try {
      const query = this.buildHybridQuery(params);

      const searchParams = {
        index: ['shops_seoul_index', 'buildings_seoul_index'],
        body: {
          query,
          size: options.maxResults || 30,
          sort: this.buildSortCriteria(params, options.sortBy),
          ...(options.includeHighlights && {
            highlight: {
              fields: {
                name: {},
                category_large: {},
                full_address: {},
              },
            },
          }),
        },
      };

      this.logger.debug(
        'Elasticsearch 하이브리드 검색 실행:',
        JSON.stringify(searchParams, null, 2),
      );

      const response: any =
        await this.elasticsearchService.search(searchParams);

      const results = response.body.hits.hits.map((hit: any) => ({
        id: hit._id,
        source: hit._source,
        score: hit._score,
        index: hit._index,
        highlights: hit.highlight || {},
        distance: hit.sort ? hit.sort[1] : undefined, // 거리 정보가 있는 경우
      }));

      this.logger.debug(`Elasticsearch 검색 결과: ${results.length}개`);
      return results;
    } catch (error) {
      this.logger.error('Elasticsearch 하이브리드 검색 실패:', error);
      return [];
    }
  }

  /**
   * 텍스트 기반 검색
   */
  async textSearch(
    searchText: string,
    options: ElasticsearchSearchOptions = {},
  ): Promise<any[]> {
    try {
      const query = {
        bool: {
          should: [
            {
              multi_match: {
                query: searchText,
                fields: [
                  'name^3',
                  'category_large^2',
                  'category_middle^1.5',
                  'full_address',
                ],
                fuzziness: options.fuzzyMatch ? 'AUTO' : undefined,
                type: 'best_fields',
              },
            },
            {
              wildcard: {
                'name.keyword': `*${searchText}*`,
              },
            },
          ],
          minimum_should_match: 1,
        },
      };

      const searchParams = {
        index: ['shops_seoul_index'],
        body: {
          query,
          size: options.maxResults || 20,
          sort: ['_score'],
        },
      };

      const response: any =
        await this.elasticsearchService.search(searchParams);

      const results = response.body.hits.hits.map((hit: any) => ({
        id: hit._id,
        source: hit._source,
        score: hit._score,
        index: hit._index,
      }));

      this.logger.debug(
        `텍스트 검색 결과: ${results.length}개 (검색어: ${searchText})`,
      );
      return results;
    } catch (error) {
      this.logger.error('Elasticsearch 텍스트 검색 실패:', error);
      return [];
    }
  }

  /**
   * 지리적 위치 기반 검색
   */
  async geoSearch(
    latitude: number,
    longitude: number,
    radiusMeters: number,
    options: ElasticsearchSearchOptions = {},
  ): Promise<any[]> {
    try {
      const query = {
        bool: {
          filter: [
            {
              geo_distance: {
                distance: `${radiusMeters}m`,
                location: {
                  lat: latitude,
                  lon: longitude,
                },
              },
            },
          ],
        },
      };

      const searchParams = {
        index: ['shops_seoul_index', 'buildings_seoul_index'],
        body: {
          query,
          size: options.maxResults || 30,
          sort: [
            {
              _geo_distance: {
                location: {
                  lat: latitude,
                  lon: longitude,
                },
                order: 'asc',
                unit: 'm',
              },
            },
          ],
        },
      };

      const response: any =
        await this.elasticsearchService.search(searchParams);

      const results = response.body.hits.hits.map((hit: any) => ({
        id: hit._id,
        source: hit._source,
        score: hit._score,
        index: hit._index,
        distance: hit.sort ? hit.sort[0] : undefined,
      }));

      this.logger.debug(
        `지리적 검색 결과: ${results.length}개 (반경 ${radiusMeters}m)`,
      );
      return results;
    } catch (error) {
      this.logger.error('Elasticsearch 지리적 검색 실패:', error);
      return [];
    }
  }

  /**
   * 카테고리별 집계 검색
   */
  async categoryAggregation(params: GeoSearchParams): Promise<any> {
    try {
      const query = this.buildHybridQuery(params);

      const searchParams = {
        index: ['shops_seoul_index'],
        body: {
          query,
          size: 0, // 문서는 가져오지 않고 집계만
          aggs: {
            categories: {
              terms: {
                field: 'category_large.keyword',
                size: 15,
              },
              aggs: {
                subcategories: {
                  terms: {
                    field: 'category_middle.keyword',
                    size: 5,
                  },
                },
              },
            },
            dong_names: {
              terms: {
                field: 'dong_name.keyword',
                size: 10,
              },
            },
          },
        },
      };

      const response: any =
        await this.elasticsearchService.search(searchParams);

      const aggregations = response.body.aggregations;
      this.logger.debug('카테고리 집계 완료');

      return {
        categories: aggregations.categories.buckets,
        areas: aggregations.dong_names.buckets,
      };
    } catch (error) {
      this.logger.error('카테고리 집계 실패:', error);
      return { categories: [], areas: [] };
    }
  }

  /**
   * 하이브리드 쿼리 빌더
   */
  private buildHybridQuery(params: GeoSearchParams): any {
    const mustClauses: any[] = [];
    const shouldClauses: any[] = [];
    const filterClauses: any[] = [];

    // 지리적 필터
    if (params.latitude && params.longitude && params.radius) {
      filterClauses.push({
        geo_distance: {
          distance: `${params.radius}m`,
          location: {
            lat: params.latitude,
            lon: params.longitude,
          },
        },
      });
    }

    // 텍스트 검색
    if (params.searchText) {
      shouldClauses.push(
        {
          multi_match: {
            query: params.searchText,
            fields: [
              'name^3',
              'category_large^2',
              'category_middle^1.5',
              'full_address',
            ],
            fuzziness: 'AUTO',
          },
        },
        {
          wildcard: {
            'name.keyword': `*${params.searchText}*`,
          },
        },
      );
    }

    // 카테고리 필터
    if (params.category) {
      shouldClauses.push({
        match: {
          category_large: params.category,
        },
      });
    }

    const query: any = {
      bool: {},
    };

    if (mustClauses.length > 0) query.bool.must = mustClauses;
    if (shouldClauses.length > 0) {
      query.bool.should = shouldClauses;
      query.bool.minimum_should_match = params.searchText ? 1 : 0;
    }
    if (filterClauses.length > 0) query.bool.filter = filterClauses;

    // 빈 쿼리인 경우 match_all 사용
    if (Object.keys(query.bool).length === 0) {
      return { match_all: {} };
    }

    return query;
  }

  /**
   * 정렬 기준 빌더
   */
  private buildSortCriteria(params: GeoSearchParams, sortBy?: string): any[] {
    const sortCriteria: any[] = [];

    if (sortBy === 'distance' && params.latitude && params.longitude) {
      sortCriteria.push({
        _geo_distance: {
          location: {
            lat: params.latitude,
            lon: params.longitude,
          },
          order: 'asc',
          unit: 'm',
        },
      });
    }

    // 기본적으로 관련성 점수도 포함
    sortCriteria.push('_score');

    return sortCriteria;
  }

  /**
   * 인덱스 상태 확인
   */
  async healthCheck(): Promise<boolean> {
    try {
      const health = await this.elasticsearchService.cluster.health();
      return health.status !== 'red';
    } catch (error) {
      this.logger.error('Elasticsearch 헬스체크 실패:', error);
      return false;
    }
  }

  /**
   * 인덱스 매핑 정보 조회
   */
  async getIndexMappings(): Promise<any> {
    try {
      const mappings = await this.elasticsearchService.indices.getMapping({
        index: ['shops_seoul_index', 'buildings_seoul_index'],
      });
      return mappings;
    } catch (error) {
      this.logger.error('인덱스 매핑 조회 실패:', error);
      return {};
    }
  }
}
