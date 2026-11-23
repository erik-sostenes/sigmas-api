import { Module } from '@nestjs/common';
import { MariaDbModule } from './mariadb.module';
import { BudgetItemController } from './infrastructure/controllers/budget-item.controller';
import {
  BudgetItemLogicI,
  BudgetItemRepositoryI,
} from './business/budget-item.ports';
import { BudgetItemLogic } from './business/budget-item.logic';
import { BudgetItemMariaDBRepository } from './infrastructure/mariadb/budget-item.mariadb.repository';

@Module({
  imports: [MariaDbModule],
  controllers: [BudgetItemController],
  providers: [
    {
      provide: BudgetItemLogicI,
      useClass: BudgetItemLogic,
    },
    {
      provide: BudgetItemRepositoryI,
      useClass: BudgetItemMariaDBRepository,
    },
  ],
  exports: [BudgetItemLogicI],
})
export class BudgetItemModule {}
