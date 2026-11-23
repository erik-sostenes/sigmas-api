import { MeasurementUnit } from './measurement-unit.model';

export abstract class MeasurementUnitLogicI {
  abstract getMeasurementUnits(): Promise<MeasurementUnit[]>;
}

export abstract class MeasurementUnitRepositoryI {
  abstract findAll(): Promise<MeasurementUnit[]>;
}
