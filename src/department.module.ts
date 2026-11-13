import { Module } from '@nestjs/common';
import { MariaDbModule } from './mariadb.module';
import { DepartmentController } from './infrastructure/controllers/department.controller';
import {
  DepartmentLogicI,
  DepartmentRepositoryI,
} from './business/department.ports';
import { DepartmentLogic } from './business/department.logic';
import { DepartmentRepository } from './infrastructure/mariadb/department.repository';

@Module({
  imports: [MariaDbModule],
  controllers: [DepartmentController],
  providers: [
    {
      provide: DepartmentLogicI,
      useClass: DepartmentLogic,
    },
    {
      provide: DepartmentRepositoryI,
      useClass: DepartmentRepository,
    },
  ],
  exports: [DepartmentLogicI, DepartmentRepositoryI],
})
export class DepartmentModule {}
