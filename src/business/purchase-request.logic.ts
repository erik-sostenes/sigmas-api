import { PurchaseRequest, PurchaseRequestID } from './purchase-request.model';
import { PurchaseRequestLogicI } from './purchase-request.ports';

export class PurchaseRequestLogic implements PurchaseRequestLogicI {
  async create(request: PurchaseRequest): Promise<PurchaseRequestID> {
    return 'Hola';
  }
}
