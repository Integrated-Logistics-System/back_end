import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Market, MarketSchema } from '../markets/schemas/market.schema';
import { Building, BuildingSchema } from '../buildings/schemas/building.schema';
import { RecommendService } from './recommend.service';
import { RecommendController } from './recommend.controller';
import { RedisModule } from '../redis/redis.module';
import { ElasticsearchModule } from '../elasticsearch/elasticsearch.module';
import { OllamaModule } from '../ollama/ollama.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Market.name, schema: MarketSchema },
      { name: Building.name, schema: BuildingSchema },
    ]),
    RedisModule,
    ElasticsearchModule.forRoot(),
    OllamaModule,
  ],
  controllers: [RecommendController],
  providers: [RecommendService],
  exports: [RecommendService],
})
export class RecommendModule {}
