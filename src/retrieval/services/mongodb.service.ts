import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

export interface MongoSearchOptions {
  limit?: number;
  skip?: number;
  includeDistance?: boolean;
  maxDistance?: number;
}

@Injectable()
export class MongodbService {
  private readonly logger = new Logger(MongodbService.name);

  constructor(@InjectConnection() private connection: Connection) {}

  /**
   * 상가 검색
   */
  async findShops(
    query: any,
    options: MongoSearchOptions = {},
  ): Promise<any[]> {
    try {
      const collection = this.connection.collection('shops_seoul');
      const cursor = collection.find(query);

      if (options.skip) cursor.skip(options.skip);
      if (options.limit) cursor.limit(options.limit);

      const results = await cursor.toArray();
      this.logger.debug(`MongoDB 상가 검색 결과: ${results.length}개`);

      return results;
    } catch (error) {
      this.logger.error('MongoDB 상가 검색 실패:', error);
      return [];
    }
  }

  /**
   * 건물 검색
   */
  async findBuildings(
    query: any,
    options: MongoSearchOptions = {},
  ): Promise<any[]> {
    try {
      const collection = this.connection.collection('buildings_seoul');
      const cursor = collection.find(query);

      if (options.skip) cursor.skip(options.skip);
      if (options.limit) cursor.limit(options.limit);

      const results = await cursor.toArray();
      this.logger.debug(`MongoDB 건물 검색 결과: ${results.length}개`);

      return results;
    } catch (error) {
      this.logger.error('MongoDB 건물 검색 실패:', error);
      return [];
    }
  }

  /**
   * 지리적 위치 기반 상가 검색 (GeoJSON 쿼리)
   */
  async findNearbyShops(
    coordinates: [number, number],
    radiusMeters: number,
    options: MongoSearchOptions = {},
  ): Promise<any[]> {
    try {
      const collection = this.connection.collection('shops_seoul');

      const query = {
        $and: [
          {
            longitude: { $exists: true, $ne: null },
            latitude: { $exists: true, $ne: null },
          },
          {
            $expr: {
              $lte: [
                {
                  $multiply: [
                    6371000, // 지구 반지름 (미터)
                    {
                      $acos: {
                        $add: [
                          {
                            $multiply: [
                              { $sin: { $degreesToRadians: coordinates[1] } },
                              { $sin: { $degreesToRadians: '$latitude' } },
                            ],
                          },
                          {
                            $multiply: [
                              { $cos: { $degreesToRadians: coordinates[1] } },
                              { $cos: { $degreesToRadians: '$latitude' } },
                              {
                                $cos: {
                                  $degreesToRadians: {
                                    $subtract: ['$longitude', coordinates[0]],
                                  },
                                },
                              },
                            ],
                          },
                        ],
                      },
                    },
                  ],
                },
                radiusMeters,
              ],
            },
          },
        ],
      };

      const cursor = collection.find(query);

      if (options.limit) cursor.limit(options.limit);

      const results = await cursor.toArray();
      this.logger.debug(
        `지리적 상가 검색 결과: ${results.length}개 (반경 ${radiusMeters}m)`,
      );

      return results;
    } catch (error) {
      this.logger.error('지리적 상가 검색 실패:', error);
      return [];
    }
  }

  /**
   * 카테고리별 상가 집계
   */
  async aggregateShopsByCategory(
    coordinates: [number, number],
    radius: number,
  ): Promise<any[]> {
    try {
      const collection = this.connection.collection('shops_seoul');

      const pipeline = [
        // 지리적 필터 (간단한 범위 검색)
        {
          $match: {
            longitude: {
              $gte: coordinates[0] - radius / 111320, // 대략적인 경도 변환
              $lte: coordinates[0] + radius / 111320,
            },
            latitude: {
              $gte: coordinates[1] - radius / 111320,
              $lte: coordinates[1] + radius / 111320,
            },
            category_large: { $exists: true, $ne: null, $not: { $eq: '' } },
          },
        },
        // 카테고리별 그룹화
        {
          $group: {
            _id: '$category_large',
            count: { $sum: 1 },
            samples: {
              $push: {
                name: '$name',
                address: '$full_address',
                category_middle: '$category_middle',
              },
            },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 15 },
      ];

      const results = await collection.aggregate(pipeline).toArray();
      this.logger.debug(`카테고리별 집계 결과: ${results.length}개 카테고리`);

      return results;
    } catch (error) {
      this.logger.error('MongoDB 집계 실패:', error);
      return [];
    }
  }

  /**
   * 텍스트 기반 상가 검색 (이름, 주소, 카테고리)
   */
  async searchShopsByText(
    searchText: string,
    options: MongoSearchOptions = {},
  ): Promise<any[]> {
    try {
      const collection = this.connection.collection('shops_seoul');

      const query = {
        $or: [
          { name: { $regex: searchText, $options: 'i' } },
          { category_large: { $regex: searchText, $options: 'i' } },
          { category_middle: { $regex: searchText, $options: 'i' } },
          { full_address: { $regex: searchText, $options: 'i' } },
          { dong_name: { $regex: searchText, $options: 'i' } },
        ],
      };

      const cursor = collection.find(query);

      if (options.skip) cursor.skip(options.skip);
      if (options.limit) cursor.limit(options.limit || 30);

      const results = await cursor.toArray();
      this.logger.debug(
        `텍스트 검색 결과: ${results.length}개 (검색어: ${searchText})`,
      );

      return results;
    } catch (error) {
      this.logger.error('텍스트 검색 실패:', error);
      return [];
    }
  }

  /**
   * 특정 동/구역의 상가 통계
   */
  async getAreaStatistics(dongName: string): Promise<any> {
    try {
      const collection = this.connection.collection('shops_seoul');

      const pipeline = [
        { $match: { dong_name: { $regex: dongName, $options: 'i' } } },
        {
          $group: {
            _id: null,
            totalShops: { $sum: 1 },
            categories: {
              $addToSet: '$category_large',
            },
            avgLatitude: { $avg: '$latitude' },
            avgLongitude: { $avg: '$longitude' },
          },
        },
      ];

      const results = await collection.aggregate(pipeline).toArray();

      if (results.length > 0) {
        const stats = results[0];
        this.logger.debug(
          `${dongName} 지역 통계: 총 ${stats.totalShops}개 상가`,
        );
        return stats;
      }

      return null;
    } catch (error) {
      this.logger.error('지역 통계 조회 실패:', error);
      return null;
    }
  }

  /**
   * 연결 상태 확인
   */
  async healthCheck(): Promise<boolean> {
    try {
      const adminDb = this.connection.db?.admin();
      if (adminDb) {
        await adminDb.ping();
      }
      return true;
    } catch (error) {
      this.logger.error('MongoDB 헬스체크 실패:', error);
      return false;
    }
  }
}
