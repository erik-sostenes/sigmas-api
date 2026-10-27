import { PurchaseRequest, PurchaseRequestID } from './purchase-request.model';

// left ports
export abstract class PurchaseRequestLogicI {
  abstract create(request: PurchaseRequest): Promise<PurchaseRequestID>;
}

// right ports
export abstract class PurchaseRequestRepositoryI {
  abstract save(request: PurchaseRequest): Promise<PurchaseRequestID>;
}
