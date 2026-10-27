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
import { CreatePurchaseRequestDto } from './create-purchase-request.dto';
import { PurchaseRequestExceptionFilter } from './domain-exception.filter';

@Controller('api/v1/purchase-requests')
@UseFilters(PurchaseRequestExceptionFilter)
export class PurchaseRequestController {
  constructor(private readonly purchaseRequestLogic: PurchaseRequestLogicI) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreatePurchaseRequestDto): Promise<{ id: string }> {
    const request = new PurchaseRequest({
      requestedBy: dto.requestedBy,
      purchaseType: dto.purchaseType,
      justification: dto.justification,
      iso: dto.iso,
      totalAmountEstimated: dto.totalAmountEstimated,
    });

    const id = await this.purchaseRequestLogic.create(request);

    return { id };
  }
}
