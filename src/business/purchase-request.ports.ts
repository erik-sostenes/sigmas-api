import {
  PurchaseRequest,
  PurchaseRequestID,
  type PurchaseType,
  type RequestStatus,
} from './purchase-request.model';

export const PURCHASE_REQUEST_SCOPES = ['requester', 'leader', 'all'] as const;
export type PurchaseRequestScope = (typeof PURCHASE_REQUEST_SCOPES)[number];

export interface PurchaseRequestComponentView {
  id: string;
  componentId: number;
  activityId: number;
  fundingSourceId: number;
  estimatedAmount: number;
  finalAmount: number;
}

export interface PurchaseRequestProductItemView {
  id: string;
  budgetItemId: number;
  measurementUnitId: number;
  quantity: number;
  description: string;
  estimatedAmount: number;
  finalAmount: number;
}

export interface PurchaseRequestListItem {
  id: PurchaseRequestID;
  requestNumber: number;
  requestedBy: string;
  status: RequestStatus;
  purchaseType: PurchaseType | null;
  justification: string;
  totalAmountEstimated: number;
  totalAmountFinal: number;
  isoIds: number[];
  components: PurchaseRequestComponentView[];
  productItems: PurchaseRequestProductItemView[];
  isRequester: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedPurchaseRequests {
  data: PurchaseRequestListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListPurchaseRequestsInput {
  clerkId: string;
  clerkMetadataRole?: string;
  scope?: PurchaseRequestScope;
  status?: RequestStatus;
  page: number;
  limit: number;
}

export interface PurchaseRequestViewer {
  userId: string;
  roleCodes: string[];
}

export interface ListPurchaseRequestsRepoQuery {
  userId: string;
  scope?: PurchaseRequestScope;
  status?: RequestStatus;
  page: number;
  limit: number;
}

// left ports
export abstract class PurchaseRequestLogicI {
  abstract create(request: PurchaseRequest): Promise<PurchaseRequestID>;
  abstract list(
    input: ListPurchaseRequestsInput,
  ): Promise<PaginatedPurchaseRequests>;
}

// right ports
export abstract class PurchaseRequestRepositoryI {
  abstract save(request: PurchaseRequest): Promise<PurchaseRequestID>;
  abstract findViewerByClerkId(
    clerkId: string,
  ): Promise<PurchaseRequestViewer | null>;
  abstract listPaginated(
    query: ListPurchaseRequestsRepoQuery,
  ): Promise<PaginatedPurchaseRequests>;
}
