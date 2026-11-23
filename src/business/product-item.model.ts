import type { PurchaseRequestID } from './purchase-request.model';
import {
  InvalidFieldError,
  InvalidAmountError,
  FinalAmountNotAllowedOnCreateError,
} from './purchase-request.errors';

export type ProductItemID = string;

export type ProductItemProps = {
  id?: ProductItemID;
  purchaseRequestId?: PurchaseRequestID;
  budgetItemId: number;
  measurementUnitId: number;
  quantity: number;
  description: string;
  estimatedAmount: number;
  finalAmount?: number;
};

export type CreateProductItemProps = Omit<
  ProductItemProps,
  'id' | 'finalAmount'
> & {
  finalAmount?: number;
};

const assertPositiveInt = (value: number, field: string): void => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new InvalidFieldError(field, 'debe ser un entero mayor a 0');
  }
};

const assertPositiveNumber = (value: number, field: string): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new InvalidAmountError(field, 'debe ser mayor a 0');
  }
};

const assertNonNegative = (value: number, field: string): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new InvalidAmountError(field, 'debe ser un número mayor o igual a 0');
  }
};

const assertNonEmpty = (value: string, field: string): void => {
  if (!value || !value.trim()) {
    throw new InvalidFieldError(field, 'no puede estar vacío');
  }
};

export class ProductItem {
  readonly id?: ProductItemID;
  readonly purchaseRequestId?: PurchaseRequestID;
  readonly budgetItemId: number;
  readonly measurementUnitId: number;
  readonly quantity: number;
  readonly description: string;
  readonly estimatedAmount: number;
  private _finalAmount: number;

  private constructor(props: ProductItemProps) {
    this.id = props.id;
    this.purchaseRequestId = props.purchaseRequestId;
    this.budgetItemId = props.budgetItemId;
    this.measurementUnitId = props.measurementUnitId;
    this.quantity = props.quantity;
    this.description = props.description;
    this.estimatedAmount = props.estimatedAmount;
    this._finalAmount = props.finalAmount ?? 0;
  }

  static create(props: CreateProductItemProps): ProductItem {
    assertPositiveInt(props.budgetItemId, 'budgetItemId');
    assertPositiveInt(props.measurementUnitId, 'measurementUnitId');
    assertPositiveNumber(props.quantity, 'quantity');
    assertNonEmpty(props.description, 'description');
    if (props.estimatedAmount <= 0) {
      throw new InvalidAmountError(
        'estimatedAmount',
        'el importe del producto no puede ser 0',
      );
    }

    if ((props.finalAmount ?? 0) !== 0) {
      throw new FinalAmountNotAllowedOnCreateError('product item');
    }

    return new ProductItem({ ...props, finalAmount: 0 });
  }

  static rehydrate(props: ProductItemProps): ProductItem {
    return new ProductItem({
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
