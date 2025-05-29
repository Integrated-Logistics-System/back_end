import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
// import { ElasticsearchModule } from '@nestjs/elasticsearch'; // 임시 비활성화
import { MongodbService } from './services/mongodb.service';
// import { EnhancedElasticsearchService } from './services/enhanced-elasticsearch.service'; // 임시 비활성화
import { GeocodingService } from './services/geocoding.service';

@Module({
  imports: [HttpModule, ConfigModule, MongooseModule],
  providers: [MongodbService, GeocodingService],
  exports: [MongodbService, GeocodingService],
})
export class RetrievalModule {}
