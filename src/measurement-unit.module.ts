import { Module } from '@nestjs/common';
import { MariaDbModule } from './mariadb.module';
import { MeasurementUnitController } from './infrastructure/controllers/measurement-unit.controller';
import {
  MeasurementUnitLogicI,
  MeasurementUnitRepositoryI,
} from './business/measurement-unit.ports';
import { MeasurementUnitLogic } from './business/measurement-unit.logic';
import { MeasurementUnitMariaDBRepository } from './infrastructure/mariadb/measurement-unit.mariadb.repository';

@Module({
  imports: [MariaDbModule],
  controllers: [MeasurementUnitController],
  providers: [
    {
      provide: MeasurementUnitLogicI,
      useClass: MeasurementUnitLogic,
    },
    {
      provide: MeasurementUnitRepositoryI,
      useClass: MeasurementUnitMariaDBRepository,
    },
  ],
  exports: [MeasurementUnitLogicI],
})
export class MeasurementUnitModule {}
