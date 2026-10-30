// business/purchase-request.model.ts
export type PurchaseRequestID = string;

export const REQUEST_STATUSES = [
  'SOLICITADO',
  'AUTORIZA_LIDER',
  'RECHAZA_LIDER',
  'AUTORIZA_SUFICIENCIA',
  'RECHAZA_SUFICIENCIA',
  'APRUEBA_SUFICIENCIA',
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const PURCHASE_TYPES = [
  'COMPRA_MOSTRADOR',
  'COMPRA_ADJ_DIRECTA',
  'COMPRA_LICITACION',
  'COMPRA_INVITACION',
] as const;
export type PurchaseType = (typeof PURCHASE_TYPES)[number];

type PurchaseRequestProps = {
  id?: PurchaseRequestID; // lo genera la BD (UUID())
  requestNumber?: number; // folio, AUTO_INCREMENT
  requestedBy: string; // users.id
  status?: RequestStatus;
  purchaseType: PurchaseType;
  iso: string;
  justification: string;
  totalAmountEstimated?: number;
  totalAmountFinal?: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export class PurchaseRequest {
  readonly id?: PurchaseRequestID;
  readonly requestNumber?: number;
  readonly requestedBy: string;
  readonly status: RequestStatus;
  readonly purchaseType: PurchaseType;
  readonly iso: string;
  readonly justification: string;
  readonly totalAmountEstimated: number;
  readonly totalAmountFinal: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  constructor(props: PurchaseRequestProps) {
    this.id = props.id;
    this.requestNumber = props.requestNumber;
    this.requestedBy = props.requestedBy;
    this.status = props.status ?? 'SOLICITADO';
    this.purchaseType = props.purchaseType;
    this.iso = props.iso;
    this.justification = props.justification;
    this.totalAmountEstimated = props.totalAmountEstimated ?? 0;
    this.totalAmountFinal = props.totalAmountFinal ?? 0;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
