import { Module } from '@nestjs/common';
import { RAGService } from './rag.service';
import { BasicRAGService } from './basic-rag.service';
import { RecommendationChain } from './chains/recommendation.chain';
import { HybridRetriever } from './retrievers/hybrid.retriever';
import { LLMModule } from '../llm/llm.module';
import { RetrievalModule } from '../retrieval/retrieval.module';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    LLMModule,
    RetrievalModule,
    CacheModule,
  ],
  providers: [
    RAGService,
    BasicRAGService, // 테스트용으로 유지
    RecommendationChain,
    HybridRetriever,
  ],
  exports: [
    RAGService,
    BasicRAGService,
  ],
})
export class RAGModule {}
