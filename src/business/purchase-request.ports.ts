import { PurchaseRequest, PurchaseRequestID } from './purchase-request.model';

// left ports
export interface PurchaseRequestLogicI {
  create(request: PurchaseRequest): Promise<PurchaseRequestID>;
}

export const PURCHASE_REQUEST_LOGIC = Symbol('PURCHASE_REQUEST_LOGIC');

// right ports
export interface PurchaseRequestRepository {
  save(request: PurchaseRequest): Promise<PurchaseRequest>;
}
