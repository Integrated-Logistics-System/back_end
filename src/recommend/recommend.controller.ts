import {
  Controller,
  Get,
  Query,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { RecommendService } from './recommend.service';

@Controller('api/recommend')
export class RecommendController {
  constructor(private readonly recommendService: RecommendService) {}

  private readonly logger = new Logger(RecommendController.name);

  @Get()
  async getRecommendations(
    @Query('dong_code') dong_code: string,
    @Query('category') category: string,
  ) {
    this.logger.log(
      `Request received - dong_code: ${dong_code}, category: ${category}`,
    );

    if (!dong_code || !category) {
      const errorMessage = 'Both dong_code and category are required';
      this.logger.error(errorMessage);
      throw new BadRequestException(errorMessage);
    }

    try {
      const result = await this.recommendService.getRecommendations(
        dong_code,
        category,
      );
      this.logger.log('Successfully processed recommendation request');
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      this.logger.error(
        `Error processing recommendation: ${errorMessage}`,
        error instanceof Error ? error.stack : '',
      );
      throw error;
    }
  }
}
