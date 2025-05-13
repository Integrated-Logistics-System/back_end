import { Controller, Get, Param } from '@nestjs/common';
import { MarketsService } from './markets.service';
import { Market } from './schemas/market.schema';

@Controller('api/markets')
export class MarketsController {
  constructor(private readonly marketsService: MarketsService) {}

  @Get()
  async getAllMarkets(): Promise<Market[]> {
    return this.marketsService.findAll();
  }

  @Get(':id')
  async getMarket(@Param('id') id: string): Promise<Market> {
    return this.marketsService.findOne(id);
  }
}
