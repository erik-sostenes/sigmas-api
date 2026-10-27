import { Module } from '@nestjs/common';
import { PurchaseRequestController } from './infrastructure/controllers/purchase-request.controller';
import { PURCHASE_REQUEST_LOGIC } from './business/purchase-request.ports';
import { PurchaseRequestLogic } from './business/purchase-request.logic';

@Module({
  imports: [],
  controllers: [PurchaseRequestController],
  providers: [
    {
      provide: PURCHASE_REQUEST_LOGIC,
      useClass: PurchaseRequestLogic,
    },
  ],
})
export class AppModule {}
