import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Market, MarketDocument } from './schemas/market.schema';

@Injectable()
export class MarketsService {
  constructor(
    @InjectModel(Market.name) private marketModel: Model<MarketDocument>,
  ) {}

  async findAll(): Promise<Market[]> {
    return this.marketModel.find().exec();
  }

  async findOne(id: string): Promise<Market> {
    const market = await this.marketModel.findOne({ shop_id: id }).exec();
    if (!market) {
      throw new NotFoundException(`Market with ID ${id} not found`);
    }
    return market;
  }
}
