import type { PurchaseRequestID } from './purchase-request.model';
import {
  InvalidFieldError,
  InvalidAmountError,
  FinalAmountNotAllowedOnCreateError,
} from './purchase-request.errors';

export type RequestComponentID = string;

// FUTURO (Fase 2 - Aprobación multi-líder): Aún no existe la columna leader_status en BD.
// Se usará cuando cada líder de actividad apruebe/rechace sus propios componentes.
export const COMPONENT_LEADER_STATUSES = [
  'PENDIENTE',
  'APROBADO',
  'RECHAZADO',
] as const;
export type ComponentLeaderStatus = (typeof COMPONENT_LEADER_STATUSES)[number];

export type RequestComponentProps = {
  id?: RequestComponentID;
  purchaseRequestId?: PurchaseRequestID;
  componentId: number;
  activityId: number;
  fundingSourceId: number;
  estimatedAmount: number;
  finalAmount?: number;
  // FUTURO (Fase 2 - Aprobación multi-líder): campos aún no persistidos en request_components
  leaderStatus?: ComponentLeaderStatus;
  leaderReviewedBy?: string | null;
  leaderReviewedAt?: Date | null;
};

export type CreateRequestComponentProps = Omit<
  RequestComponentProps,
  | 'id'
  | 'finalAmount'
  | 'leaderStatus'
  | 'leaderReviewedBy'
  | 'leaderReviewedAt'
> & {
  finalAmount?: number;
};

const assertPositiveInt = (value: number, field: string): void => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new InvalidFieldError(field, 'debe ser un entero mayor a 0');
  }
};

const assertNonNegative = (value: number, field: string): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new InvalidAmountError(field, 'debe ser un número mayor o igual a 0');
  }
};

export class RequestComponent {
  readonly id?: RequestComponentID;
  readonly purchaseRequestId?: PurchaseRequestID;
  readonly componentId: number;
  readonly activityId: number;
  readonly fundingSourceId: number;
  readonly estimatedAmount: number;
  private _finalAmount: number;

  // FUTURO (Fase 2 - Aprobación multi-líder): No se usan en la primera entrega.
  private _leaderStatus: ComponentLeaderStatus;
  private _leaderReviewedBy: string | null;
  private _leaderReviewedAt: Date | null;

  private constructor(props: RequestComponentProps) {
    this.id = props.id;
    this.purchaseRequestId = props.purchaseRequestId;
    this.componentId = props.componentId;
    this.activityId = props.activityId;
    this.fundingSourceId = props.fundingSourceId;
    this.estimatedAmount = props.estimatedAmount;
    this._finalAmount = props.finalAmount ?? 0;
    this._leaderStatus = props.leaderStatus ?? 'PENDIENTE';
    this._leaderReviewedBy = props.leaderReviewedBy ?? null;
    this._leaderReviewedAt = props.leaderReviewedAt ?? null;
  }

  static create(props: CreateRequestComponentProps): RequestComponent {
    assertPositiveInt(props.componentId, 'componentId');
    assertPositiveInt(props.activityId, 'activityId');
    assertPositiveInt(props.fundingSourceId, 'fundingSourceId');
    assertNonNegative(props.estimatedAmount, 'estimatedAmount');

    if ((props.finalAmount ?? 0) !== 0) {
      throw new FinalAmountNotAllowedOnCreateError('request component');
    }

    return new RequestComponent({
      ...props,
      finalAmount: 0,
      leaderStatus: 'PENDIENTE',
      leaderReviewedBy: null,
      leaderReviewedAt: null,
    });
  }

  static rehydrate(props: RequestComponentProps): RequestComponent {
    return new RequestComponent({
      ...props,
      finalAmount: props.finalAmount ?? 0,
      leaderStatus: props.leaderStatus ?? 'PENDIENTE',
      leaderReviewedBy: props.leaderReviewedBy ?? null,
      leaderReviewedAt: props.leaderReviewedAt ?? null,
    });
  }

  get finalAmount(): number {
    return this._finalAmount;
  }

  // FUTURO (Fase 2 - Aprobación multi-líder)
  get leaderStatus(): ComponentLeaderStatus {
    return this._leaderStatus;
  }
  get leaderReviewedBy(): string | null {
    return this._leaderReviewedBy;
  }
  get leaderReviewedAt(): Date | null {
    return this._leaderReviewedAt;
  }

  updateFinalAmount(newAmount: number): void {
    assertNonNegative(newAmount, 'finalAmount');
    this._finalAmount = newAmount;
  }

  // FUTURO (Fase 2 - Aprobación multi-líder): Se llamarán desde endpoints PATCH de aprobación por líder.
  approveByLeader(reviewerUserId: string, reviewedAt = new Date()): void {
    if (!reviewerUserId || !reviewerUserId.trim()) {
      throw new InvalidFieldError('leaderReviewedBy', 'es obligatorio');
    }
    this._leaderStatus = 'APROBADO';
    this._leaderReviewedBy = reviewerUserId;
    this._leaderReviewedAt = reviewedAt;
  }

  rejectByLeader(reviewerUserId: string, reviewedAt = new Date()): void {
    if (!reviewerUserId || !reviewerUserId.trim()) {
      throw new InvalidFieldError('leaderReviewedBy', 'es obligatorio');
    }
    this._leaderStatus = 'RECHAZADO';
    this._leaderReviewedBy = reviewerUserId;
    this._leaderReviewedAt = reviewedAt;
  }
}
