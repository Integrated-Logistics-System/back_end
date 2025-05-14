import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import configuration from '../config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BuildingsModule } from './buildings/buildings.module';
import { ElasticsearchModule } from './elasticsearch/elasticsearch.module';
import { MarketsModule } from './markets/markets.module';
import { OllamaModule } from './ollama/ollama.module';
import { RecommendModule } from './recommend/recommend.module';

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
    RecommendModule,
    // RedisModule,  // 임시로 주석 처리
    ElasticsearchModule.forRoot(),
    OllamaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
