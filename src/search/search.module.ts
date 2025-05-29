import { Module } from "@nestjs/common";
import { ElasticsearchModule } from "@nestjs/elasticsearch";
import { SearchService } from "./search.service";
import { SearchController } from "./search.controller";
import { elasticsearchConfig } from "../config/elasticsearch.config";

@Module({
  imports: [ElasticsearchModule.registerAsync(elasticsearchConfig())],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
