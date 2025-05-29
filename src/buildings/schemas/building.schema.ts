import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BuildingDocument = Document & {
  unique_id: string;
  dong_code: string;
  dong_name: string;
  jibun: string;
  building_name: string;
  land_area: number;
  building_area: number;
  purpose_category_name: string;
  purpose_name: string;
  detail_purpose_name: string;
  structure_name: string;
  above_ground_floors: number;
  below_ground_floors: number;
  built_year: number;
  renovation_year: number;
  address: string;
  coordinates: [number, number];
  __v: number;
  score?: number;
};

@Schema()
export class Building {
  @Prop({ required: true })
  unique_id: string;

  @Prop({ required: true })
  dong_code: string;

  @Prop({ required: true })
  dong_name: string;

  @Prop({ required: true })
  jibun: string;

  @Prop({ required: true })
  building_name: string;

  @Prop({ required: true })
  land_area: number;

  @Prop({ required: true })
  building_area: number;

  @Prop({ required: true })
  purpose_category_name: string;

  @Prop({ required: true })
  purpose_name: string;

  @Prop({ required: true })
  detail_purpose_name: string;

  @Prop({ required: true })
  structure_name: string;

  @Prop({ required: true })
  above_ground_floors: number;

  @Prop({ required: true })
  below_ground_floors: number;

  @Prop({ required: true })
  built_year: number;

  @Prop({ required: true })
  renovation_year: number;

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  coordinates: [number, number];

  @Prop()
  score?: number;

  constructor(
    unique_id: string,
    dong_code: string,
    dong_name: string,
    jibun: string,
    building_name: string,
    land_area: number,
    building_area: number,
    purpose_category_name: string,
    purpose_name: string,
    detail_purpose_name: string,
    structure_name: string,
    above_ground_floors: number,
    below_ground_floors: number,
    built_year: number,
    renovation_year: number,
    address: string,
    coordinates: [number, number],
    score?: number,
  ) {
    this.unique_id = unique_id;
    this.dong_code = dong_code;
    this.dong_name = dong_name;
    this.jibun = jibun;
    this.building_name = building_name;
    this.land_area = land_area;
    this.building_area = building_area;
    this.purpose_category_name = purpose_category_name;
    this.purpose_name = purpose_name;
    this.detail_purpose_name = detail_purpose_name;
    this.structure_name = structure_name;
    this.above_ground_floors = above_ground_floors;
    this.below_ground_floors = below_ground_floors;
    this.built_year = built_year;
    this.renovation_year = renovation_year;
    this.address = address;
    this.coordinates = coordinates;
    this.score = score;
  }
}

export const BuildingSchema = SchemaFactory.createForClass(Building);
