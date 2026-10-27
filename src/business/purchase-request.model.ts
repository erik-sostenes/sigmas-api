export type PurchaseRequestID = string;

export type RequestStatus =
  | 'BORRADOR'
  | 'REVISION_LIDERES'
  | 'REVISION_SUFICIENCIA_1'
  | 'ESTUDIO_MERCADO'
  | 'REVISION_SUFICIENCIA_2'
  | 'REVISION_REVISOR'
  | 'FIRMAS_FISICAS'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'AJUSTES_SOLICITANTE';

export class PurchaseRequest {
  constructor(
    public readonly id: PurchaseRequestID,
    public requestNumber: number,
    public requestedBy: string,
    public status: RequestStatus,
    public justification: string,
    public totalEstimated: number,
    public totalFinal: number,
    public isoStandard: string,
    public createdAt?: Date,
    public updatedAt?: Date,
  ) {}
}
