import { Injectable } from '@nestjs/common';
import { PurchaseRequest, PurchaseRequestID } from './purchase-request.model';
import {
  PurchaseRequestLogicI,
  PurchaseRequestRepositoryI,
} from './purchase-request.ports';

@Injectable()
export class PurchaseRequestLogic implements PurchaseRequestLogicI {
  constructor(
    private readonly purchaseRequestRepository: PurchaseRequestRepositoryI,
  ) {}
  async create(request: PurchaseRequest): Promise<PurchaseRequestID> {
    const id = await this.purchaseRequestRepository.save(request);

    return id;
  }
}
