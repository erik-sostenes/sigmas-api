import { Injectable } from '@nestjs/common';
import { MeasurementUnit } from './measurement-unit.model';
import {
  MeasurementUnitLogicI,
  MeasurementUnitRepositoryI,
} from './measurement-unit.ports';

@Injectable()
export class MeasurementUnitLogic implements MeasurementUnitLogicI {
  constructor(
    private readonly measurementUnitRepository: MeasurementUnitRepositoryI,
  ) {}

  async getMeasurementUnits(): Promise<MeasurementUnit[]> {
    return await this.measurementUnitRepository.findAll();
  }
}
