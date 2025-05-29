import { Injectable, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit {
  private client!: RedisClientType;

  async onModuleInit() {
    this.client = createClient({
      url: 'redis://192.168.0.111:6379',
      // 재연결 설정 추가
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 5) {
            console.error('Redis 연결 재시도 횟수 초과');
            return new Error('Redis 연결 실패');
          }
          return Math.min(retries * 100, 5000); // 최대 5초 대기
        },
      },
    });

    // 에러 이벤트 리스너 추가
    this.client.on('error', (err) => {
      console.error('Redis Client Error', err);
    });

    await this.client.connect();
  }

  // get 메서드 추가
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  // set 메서드 추가
  async set(
    key: string,
    value: string,
    mode: 'EX' | 'PX' | 'KEEPTTL' = 'EX',
    duration?: number,
  ): Promise<string | null> {
    if (mode === 'EX' || mode === 'PX') {
      if (!duration) {
        throw new Error('Duration is required for EX/PX mode');
      }
      return this.client.set(key, value, {
        [mode === 'EX' ? 'EX' : 'PX']: duration,
      });
    }
    return this.client.set(key, value, { [mode]: true });
  }

  // 기존 getClient 메서드
  getClient(): RedisClientType {
    return this.client;
  }
}
