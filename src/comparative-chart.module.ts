import { Module } from '@nestjs/common';
import { MariaDbModule } from './mariadb.module';
import { ViewerModule } from './viewer.module';
import { PurchaseRequestModule } from './purchase-request.module';
import { ComparativeChartController } from './infrastructure/controllers/comparative-chart.controller';
import { ComparativeChartLogic } from './business/comparative-chart.logic';
import {
  ComparativeChartLogicI,
  ComparativeChartRepositoryI,
} from './business/comparative-chart.ports';
import { ComparativeChartRepository } from './infrastructure/mariadb/comparative-chart.repository';

@Module({
  imports: [MariaDbModule, ViewerModule, PurchaseRequestModule],
  controllers: [ComparativeChartController],
  providers: [
    { provide: ComparativeChartLogicI, useClass: ComparativeChartLogic },
    {
      provide: ComparativeChartRepositoryI,
      useClass: ComparativeChartRepository,
    },
  ],
})
export class ComparativeChartModule {}
