import { Controller, Get, Param } from '@nestjs/common';
import { BuildingsService } from './buildings.service';
import { Building } from './schemas/building.schema';

@Controller('api/buildings')
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Get()
  async getAllBuildings(): Promise<Building[]> {
    return this.buildingsService.findAll();
  }

  @Get(':id')
  async getBuilding(@Param('id') id: string): Promise<Building> {
    return this.buildingsService.findOne(id);
  }
}
