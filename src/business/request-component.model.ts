import type { PurchaseRequestID } from './purchase-request.model';
import {
  InvalidFieldError,
  InvalidAmountError,
  FinalAmountNotAllowedOnCreateError,
} from './purchase-request.errors';

export type RequestComponentID = string;

export type RequestComponentProps = {
  id?: RequestComponentID;
  purchaseRequestId?: PurchaseRequestID;
  componentId: number;
  activityId: number;
  fundingSourceId: number;
  estimatedAmount: number;
  finalAmount?: number;
};

export type CreateRequestComponentProps = Omit<
  RequestComponentProps,
  'id' | 'finalAmount'
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

  private constructor(props: RequestComponentProps) {
    this.id = props.id;
    this.purchaseRequestId = props.purchaseRequestId;
    this.componentId = props.componentId;
    this.activityId = props.activityId;
    this.fundingSourceId = props.fundingSourceId;
    this.estimatedAmount = props.estimatedAmount;
    this._finalAmount = props.finalAmount ?? 0;
  }

  static create(props: CreateRequestComponentProps): RequestComponent {
    assertPositiveInt(props.componentId, 'componentId');
    assertPositiveInt(props.activityId, 'activityId');
    assertPositiveInt(props.fundingSourceId, 'fundingSourceId');
    assertNonNegative(props.estimatedAmount, 'estimatedAmount');

    if ((props.finalAmount ?? 0) !== 0) {
      throw new FinalAmountNotAllowedOnCreateError('request component');
    }

    return new RequestComponent({ ...props, finalAmount: 0 });
  }

  static rehydrate(props: RequestComponentProps): RequestComponent {
    return new RequestComponent({
      ...props,
      finalAmount: props.finalAmount ?? 0,
    });
  }

  get finalAmount(): number {
    return this._finalAmount;
  }

  updateFinalAmount(newAmount: number): void {
    assertNonNegative(newAmount, 'finalAmount');
    this._finalAmount = newAmount;
  }
}
