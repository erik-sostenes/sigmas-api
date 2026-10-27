import { Module } from '@nestjs/common';
import { PurchaseRequestController } from './infrastructure/controllers/purchase-request.controller';
import { PurchaseRequestLogic } from './business/purchase-request.logic';
import {
  PurchaseRequestLogicI,
  PurchaseRequestRepositoryI,
} from './business/purchase-request.ports';
import { PurchaseRequestRepository } from './infrastructure/mariadb/purchase-request.repository';
import { MariaDbModule } from './mariadb.module';

@Module({
  imports: [MariaDbModule],
  controllers: [PurchaseRequestController],
  providers: [
    { provide: PurchaseRequestLogicI, useClass: PurchaseRequestLogic },
    {
      provide: PurchaseRequestRepositoryI,
      useClass: PurchaseRequestRepository,
    },
  ],
})
export class PurchaseRequestModule {}
