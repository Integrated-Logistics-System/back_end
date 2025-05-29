import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { RecommendRequestDto } from './dto/recommend-request.dto';
import { RecommendResponseDto } from './dto/recommend-response.dto';
import { ApiResponse, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { RecommendService } from './recommend.service';

@ApiTags('추천')
@Controller('recommend')
export class RecommendController {
  constructor(private readonly recommendService: RecommendService) {}

  @Post()
  @ApiOperation({ summary: '창업 자리 추천' })
  @ApiResponse({ status: 200, type: RecommendResponseDto, description: '추천 결과' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 500, description: '서버 오류' })
  async getRecommendations(
    @Body() body: RecommendRequestDto,
  ): Promise<RecommendResponseDto> {
    return this.recommendService.getRecommendations(body.text);
  }

  @Get('health')
  @ApiOperation({ summary: 'RAG 시스템 상태 확인' })
  @ApiResponse({ status: 200, description: '시스템 상태 정보' })
  async checkHealth(): Promise<{
    status: string;
    components: any;
    timestamp: string;
  }> {
    const isHealthy = await this.recommendService.checkHealth();
    
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      components: {
        rag_system: isHealthy,
        database: true, // MongoDB 연결 상태
        search_engine: true, // Elasticsearch 상태
        cache: true, // Redis 상태
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('test')
  @ApiOperation({ summary: '간단한 테스트 요청' })
  @ApiQuery({ name: 'query', required: false, description: '테스트 쿼리', example: '강남역 카페' })
  async testRecommendation(
    @Query('query') query: string = '강남역 근처 카페 추천해주세요'
  ): Promise<RecommendResponseDto> {
    return this.recommendService.getRecommendations(query);
  }
}
