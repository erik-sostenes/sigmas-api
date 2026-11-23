import type { PurchaseRequestID } from './purchase-request.model';
import {
  InvalidFieldError,
  InvalidAmountError,
  FinalAmountNotAllowedOnCreateError,
  LeaderRowAlreadyDecidedError,
} from './purchase-request.errors';

export type RequestComponentID = string;

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
  // Líder de la actividad, fijado al guardar la solicitud. Undefined antes de persistir.
  leaderId?: string;
  leaderStatus?: ComponentLeaderStatus;
  leaderDecidedAt?: Date | null;
};

export type CreateRequestComponentProps = Omit<
  RequestComponentProps,
  'id' | 'finalAmount' | 'leaderId' | 'leaderStatus' | 'leaderDecidedAt'
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
  readonly leaderId?: string;
  private _finalAmount: number;
  private _leaderStatus: ComponentLeaderStatus;
  private _leaderDecidedAt: Date | null;

  private constructor(props: RequestComponentProps) {
    this.id = props.id;
    this.purchaseRequestId = props.purchaseRequestId;
    this.componentId = props.componentId;
    this.activityId = props.activityId;
    this.fundingSourceId = props.fundingSourceId;
    this.estimatedAmount = props.estimatedAmount;
    this.leaderId = props.leaderId;
    this._finalAmount = props.finalAmount ?? 0;
    this._leaderStatus = props.leaderStatus ?? 'PENDIENTE';
    this._leaderDecidedAt = props.leaderDecidedAt ?? null;
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
      leaderDecidedAt: null,
    });
  }

  static rehydrate(props: RequestComponentProps): RequestComponent {
    return new RequestComponent({
      ...props,
      finalAmount: props.finalAmount ?? 0,
      leaderStatus: props.leaderStatus ?? 'PENDIENTE',
      leaderDecidedAt: props.leaderDecidedAt ?? null,
    });
  }

  get finalAmount(): number {
    return this._finalAmount;
  }
  get leaderStatus(): ComponentLeaderStatus {
    return this._leaderStatus;
  }
  get leaderDecidedAt(): Date | null {
    return this._leaderDecidedAt;
  }

  updateFinalAmount(newAmount: number): void {
    assertNonNegative(newAmount, 'finalAmount');
    this._finalAmount = newAmount;
  }

  // Solo PurchaseRequest debe llamarlo: ahí se valida el estado de la solicitud y el líder.
  decide(
    decision: Exclude<ComponentLeaderStatus, 'PENDIENTE'>,
    decidedAt = new Date(),
  ): void {
    if (this._leaderStatus !== 'PENDIENTE') {
      throw new LeaderRowAlreadyDecidedError(this.id ?? '');
    }
    this._leaderStatus = decision;
    this._leaderDecidedAt = decidedAt;
  }
}
