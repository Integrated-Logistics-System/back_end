import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MarketDocument = Market & Document;

@Schema()
export class Market {
  @Prop({ required: true })
  shop_id!: string;

  @Prop()
  name!: string;

  @Prop()
  category_large!: string;

  @Prop()
  category_middle!: string;

  @Prop()
  category_small!: string;

  @Prop()
  dong_code!: string;

  @Prop()
  longitude!: number;

  @Prop()
  latitude!: number;
}

export const MarketSchema = SchemaFactory.createForClass(Market);
