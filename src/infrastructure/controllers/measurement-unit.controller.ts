import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { MeasurementUnitLogicI } from '../../business/measurement-unit.ports';
import { MeasurementUnit } from '../../business/measurement-unit.model';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';

@Controller('api/v1/measurement-units')
@UseGuards(ClerkAuthGuard)
export class MeasurementUnitController {
  constructor(private readonly measurementUnitLogic: MeasurementUnitLogicI) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getMeasurementUnits(): Promise<MeasurementUnit[]> {
    return await this.measurementUnitLogic.getMeasurementUnits();
  }
}
