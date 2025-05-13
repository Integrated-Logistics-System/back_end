import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Building, BuildingDocument } from './schemas/building.schema';

@Injectable()
export class BuildingsService {
  constructor(
    @InjectModel(Building.name) private buildingModel: Model<BuildingDocument>,
  ) {}

  async findAll(): Promise<Building[]> {
    return this.buildingModel.find().exec();
  }

  async findOne(id: string): Promise<Building> {
    const building = await this.buildingModel.findOne({ unique_id: id }).exec();
    if (!building) {
      throw new NotFoundException(`Building with ID ${id} not found`);
    }
    return building;
  }
}
