import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Market, MarketDocument } from '../markets/schemas/market.schema';

@Injectable()
export class RecommendService {
  constructor(
    @InjectModel(Market.name) private marketModel: Model<MarketDocument>,
  ) {}

  async getRecommendations(dong_code: string, category: string) {
    return this.marketModel
      .find({
        dong_code,
        category_large: category,
      })
      .exec();
  }
}
