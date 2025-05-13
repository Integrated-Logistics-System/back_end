import { Controller, Get, Query } from '@nestjs/common';
import { RecommendService } from './recommend.service';

@Controller('api/recommend')
export class RecommendController {
  constructor(private readonly recommendService: RecommendService) {}

  @Get()
  async getRecommendations(
    @Query('dong_code') dong_code: string,
    @Query('category') category: string,
  ) {
    return this.recommendService.getRecommendations(dong_code, category);
  }
}
