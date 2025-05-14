import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BuildingDocument = Building & Document;

@Schema()
export class Building {
  @Prop({ required: true })
  unique_id!: string;

  @Prop()
  dong_code!: string;

  @Prop()
  dong_name!: string;

  @Prop()
  jibun!: string;

  @Prop()
  building_name!: string;

  @Prop()
  land_area!: number;

  @Prop()
  building_area!: number;

  @Prop()
  purpose_category_name!: string;
}

export const BuildingSchema = SchemaFactory.createForClass(Building);
