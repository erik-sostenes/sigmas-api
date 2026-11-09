import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseFilters,
} from '@nestjs/common';
import { PurchaseRequestLogicI } from '../../business/purchase-request.ports';
import { PurchaseRequest } from '../../business/purchase-request.model';
import { RequestComponent } from '../../business/request-component.model';
import { ProductItem } from '../../business/product-item.model';
import { CreatePurchaseRequestDto } from './create-purchase-request.dto';
import { PurchaseRequestExceptionFilter } from './domain-exception.filter';

@Controller('api/v1/purchase-requests')
@UseFilters(PurchaseRequestExceptionFilter)
export class PurchaseRequestController {
  constructor(private readonly purchaseRequestLogic: PurchaseRequestLogicI) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreatePurchaseRequestDto): Promise<{ id: string }> {
    const components = (dto.requestComponents ?? []).map((c) =>
      RequestComponent.create({
        componentId: c.componentId,
        activityId: c.activityId,
        fundingSourceId: c.fundingSourceId,
        estimatedAmount: c.estimatedAmount,
      }),
    );

    const items = (dto.productItems ?? []).map((i) =>
      ProductItem.create({
        budgetItemId: i.budgetItemId,
        measurementUnitId: i.measurementUnitId,
        quantity: i.quantity,
        description: i.description,
        estimatedAmount: i.estimatedAmount,
      }),
    );

    const request = PurchaseRequest.create({
      requestedBy: dto.requestedBy,
      justification: dto.justification,
      isoId: dto.isoId,
      requestComponents: components,
      productItems: items,
    });

    const id = await this.purchaseRequestLogic.create(request);

    return { id };
  }
}
