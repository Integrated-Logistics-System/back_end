import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ElasticsearchModule as NestElasticsearchModule,
} from '@nestjs/elasticsearch';

@Global()
@Module({})
export class ElasticsearchModule {
  static forRoot(): DynamicModule {
    return {
      module: ElasticsearchModule,
      imports: [
        NestElasticsearchModule.registerAsync({
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const node = configService.get<string>('elasticsearch.node') || 'http://localhost:9200';
            
            return {
              node,
              maxRetries: 3,
              requestTimeout: 10000,
              // 간단한 설정만 사용
            };
          },
        }),
      ],
      exports: [NestElasticsearchModule],
    };
  }
}
