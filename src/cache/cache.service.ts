import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis: Redis;
  private readonly defaultTtl: number;

  constructor(private readonly configService: ConfigService) {
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
    this.defaultTtl = this.configService.get<number>('CACHE_TTL', 300);

    this.redis = new Redis({
      host: redisHost,
      port: redisPort,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('connect', () => {
      this.logger.log(`Redis 연결 성공: ${redisHost}:${redisPort}`);
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis 연결 오류:', error);
    });

    this.redis.on('ready', () => {
      this.logger.log('Redis 준비 완료');
    });
  }

  /**
   * 캐시에서 값 조회
   */
  async get(key: string): Promise<string | null> {
    try {
      const value = await this.redis.get(key);
      if (value) {
        this.logger.debug(`캐시 히트: ${key}`);
      } else {
        this.logger.debug(`캐시 미스: ${key}`);
      }
      return value;
    } catch (error) {
      this.logger.error(`캐시 조회 실패 [${key}]:`, error);
      return null;
    }
  }

  /**
   * 캐시에 값 저장
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    try {
      const ttl = ttlSeconds || this.defaultTtl;
      await this.redis.setex(key, ttl, value);
      this.logger.debug(`캐시 저장: ${key} (TTL: ${ttl}초)`);
      return true;
    } catch (error) {
      this.logger.error(`캐시 저장 실패 [${key}]:`, error);
      return false;
    }
  }

  /**
   * JSON 객체 캐시 저장
   */
  async setJSON(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      const jsonString = JSON.stringify(value);
      return await this.set(key, jsonString, ttlSeconds);
    } catch (error) {
      this.logger.error(`JSON 캐시 저장 실패 [${key}]:`, error);
      return false;
    }
  }

  /**
   * JSON 객체 캐시 조회
   */
  async getJSON<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.get(key);
      if (value) {
        return JSON.parse(value) as T;
      }
      return null;
    } catch (error) {
      this.logger.error(`JSON 캐시 조회 실패 [${key}]:`, error);
      return null;
    }
  }

  /**
   * 캐시 키 삭제
   */
  async del(key: string): Promise<boolean> {
    try {
      await this.redis.del(key);
      this.logger.debug(`캐시 삭제: ${key}`);
      return true;
    } catch (error) {
      this.logger.error(`캐시 삭제 실패 [${key}]:`, error);
      return false;
    }
  }

  /**
   * 패턴 매칭으로 키 삭제
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        const deletedCount = await this.redis.del(...keys);
        this.logger.debug(`패턴 삭제: ${pattern}, ${deletedCount}개 키 삭제`);
        return deletedCount;
      }
      return 0;
    } catch (error) {
      this.logger.error(`패턴 삭제 실패 [${pattern}]:`, error);
      return 0;
    }
  }

  /**
   * 키 존재 여부 확인
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`키 존재 확인 실패 [${key}]:`, error);
      return false;
    }
  }

  /**
   * TTL 조회
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      this.logger.error(`TTL 조회 실패 [${key}]:`, error);
      return -1;
    }
  }

  /**
   * TTL 갱신
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      const result = await this.redis.expire(key, ttlSeconds);
      return result === 1;
    } catch (error) {
      this.logger.error(`TTL 갱신 실패 [${key}]:`, error);
      return false;
    }
  }

  /**
   * 캐시 통계 조회
   */
  async getStats(): Promise<{
    totalKeys: number;
    usedMemory: string;
    hitRate?: number;
  }> {
    try {
      const info = await this.redis.info('memory');
      const keyCount = await this.redis.dbsize();
      
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const usedMemory = memoryMatch ? memoryMatch[1].trim() : 'Unknown';

      return {
        totalKeys: keyCount,
        usedMemory,
      };
    } catch (error) {
      this.logger.error('캐시 통계 조회 실패:', error);
      return {
        totalKeys: 0,
        usedMemory: 'Unknown',
      };
    }
  }

  /**
   * 전체 캐시 삭제 (개발용)
   */
  async flushAll(): Promise<boolean> {
    try {
      await this.redis.flushall();
      this.logger.warn('전체 캐시 삭제 완료');
      return true;
    } catch (error) {
      this.logger.error('전체 캐시 삭제 실패:', error);
      return false;
    }
  }

  /**
   * RAG 결과 캐시 키 생성
   */
  createRAGCacheKey(userQuery: string): string {
    const hash = Buffer.from(userQuery).toString('base64');
    return `rag:recommendation:${hash}`;
  }

  /**
   * 검색 결과 캐시 키 생성
   */
  createSearchCacheKey(searchParams: any): string {
    const hash = Buffer.from(JSON.stringify(searchParams)).toString('base64');
    return `search:results:${hash}`;
  }

  /**
   * 지오코딩 결과 캐시 키 생성
   */
  createGeocodingCacheKey(address: string): string {
    const hash = Buffer.from(address).toString('base64');
    return `geocoding:${hash}`;
  }

  /**
   * 헬스체크
   */
  async healthCheck(): Promise<boolean> {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG';
    } catch (error) {
      this.logger.error('Redis 헬스체크 실패:', error);
      return false;
    }
  }

  /**
   * 연결 종료
   */
  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
      this.logger.log('Redis 연결 종료');
    } catch (error) {
      this.logger.error('Redis 연결 종료 실패:', error);
    }
  }
}
