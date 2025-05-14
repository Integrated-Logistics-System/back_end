import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ElasticsearchModule as NestElasticsearchModule,
  ElasticsearchModuleOptions,
} from '@nestjs/elasticsearch';

// Elasticsearch 9.x 호환을 위한 타입 확장
interface ExtendedElasticsearchOptions extends ElasticsearchModuleOptions {
  node: string;
  auth?: {
    username: string;
    password: string;
  };
  tls?: {
    rejectUnauthorized: boolean;
  };
  maxRetries?: number;
  requestTimeout?: number;
}

@Global()
@Module({})
export class ElasticsearchModule {
  static forRoot(): DynamicModule {
    return {
      module: ElasticsearchModule,
      imports: [
        NestElasticsearchModule.registerAsync({
          inject: [ConfigService],
          useFactory: (
            configService: ConfigService,
          ): ExtendedElasticsearchOptions => {
            const node =
              configService.get<string>('elasticsearch.node') ||
              'http://localhost:9200';
            const username = configService.get<string>(
              'elasticsearch.username',
            );
            const password = configService.get<string>(
              'elasticsearch.password',
            );

            // Elasticsearch 9.x 호환 옵션
            const esOptions: ExtendedElasticsearchOptions = {
              node,
              maxRetries: 5,
              requestTimeout: 30000,
            };

            // 인증 정보 설정 (Elasticsearch 9.x 스타일)
            if (username && password) {
              esOptions.auth = { username, password };
            }

            // SSL/TLS 설정 (https인 경우)
            if (node.startsWith('https')) {
              esOptions.tls = {
                rejectUnauthorized: false, // 개발 환경에서만 사용, 프로덕션에서는 적절한 인증서 사용
              };
            }

            return esOptions;
          },
        }),
      ],
      exports: [NestElasticsearchModule],
    };
  }
}
