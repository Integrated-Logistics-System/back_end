import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ElasticsearchModule } from '../elasticsearch/elasticsearch.module';
import { MongodbService } from './services/mongodb.service';
import { RealDataService } from './services/real-data.service';
import { GeocodingService } from './services/geocoding.service';

@Module({
  imports: [
    HttpModule, 
    ConfigModule, 
    MongooseModule,
    ElasticsearchModule // RealDataService에서 필요
  ],
  providers: [
    MongodbService, 
    RealDataService, // 새로 추가
    GeocodingService
  ],
  exports: [
    MongodbService, 
    RealDataService, // 새로 추가
    GeocodingService
  ],
})
export class RetrievalModule {}
