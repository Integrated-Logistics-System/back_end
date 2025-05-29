import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import configuration from '../config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BuildingsModule } from './buildings/buildings.module';
import { ElasticsearchModule } from './elasticsearch/elasticsearch.module';
import { MarketsModule } from './markets/markets.module';
import { NaverModule } from './naver/naver.module';
import { RecommendModule } from './recommend/recommend.module';
import { RAGModule } from './rag/rag.module';
import { LLMModule } from './llm/llm.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: './config/.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('mongoUri'),
      }),
    }),
    BuildingsModule,
    MarketsModule,
    NaverModule,
    RecommendModule,
    RAGModule,
    LLMModule,
    // ElasticsearchModule.forRoot(), // 임시 비활성화
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
