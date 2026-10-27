import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Res,
} from '@nestjs/common';
import type { PurchaseRequestLogicI } from '../../business/purchase-request.ports';
import { PURCHASE_REQUEST_LOGIC } from '../../business/purchase-request.ports';
import type { Response } from 'express';

@Controller('api/v1/purchase-requests')
export class PurchaseRequestController {
  constructor(
    @Inject(PURCHASE_REQUEST_LOGIC)
    private readonly purchaseRequestLogic: PurchaseRequestLogicI,
  ) {}

  @Get()
  @HttpCode(HttpStatus.CREATED)
  async getHello(@Res({ passthrough: true }) res: Response) {
    const id = await this.purchaseRequestLogic.create({} as any);

    res.status(201).json({ id: id });
  }
}
