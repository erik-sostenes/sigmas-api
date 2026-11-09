import { ProductItem } from './product-item.model';
import { RequestComponent } from './request-component.model';
import {
  InvalidFieldError,
  InvalidAmountError,
  InvalidStatusTransitionError,
  DuplicatedRequestComponentError,
  ProductItemNotFoundError,
  RequestComponentNotFoundError,
  MissingRequestComponentsError,
  MissingProductItemsError,
  ComponentsAmountMismatchError,
  ProductsAmountMismatchError,
} from './purchase-request.errors';

export type PurchaseRequestID = string;

export const REQUEST_STATUSES = [
  'SOLICITADO',
  'APRUEBA_LIDER',
  'RECHAZA_LIDER',
  'AUTORIZA_SUFICIENCIA',
  'RECHAZA_SUFICIENCIA',
  'EN_REVISION_RECURSOS',
  'RECHAZA_RECURSOS',
  'PENDIENTE_APROBACION_SUFICIENCIA',
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

export type PurchaseRequestProps = {
  id?: PurchaseRequestID;
  requestNumber?: number;
  requestedBy: string;
  status?: RequestStatus;
  purchaseType?: PurchaseType;
  isoId: number;
  justification: string;
  totalAmountEstimated?: number;
  totalAmountFinal?: number;
  requestComponents?: RequestComponent[];
  productItems?: ProductItem[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type CreatePurchaseRequestProps = Omit<
  PurchaseRequestProps,
  | 'id'
  | 'requestNumber'
  | 'status'
  | 'purchaseType'
  | 'totalAmountEstimated'
  | 'totalAmountFinal'
  | 'createdAt'
  | 'updatedAt'
>;

const ALLOWED_STATUS_TRANSITIONS: Record<
  RequestStatus,
  readonly RequestStatus[]
> = {
  SOLICITADO: ['APRUEBA_LIDER', 'RECHAZA_LIDER'],
  APRUEBA_LIDER: ['AUTORIZA_SUFICIENCIA', 'RECHAZA_SUFICIENCIA'],
  AUTORIZA_SUFICIENCIA: ['EN_REVISION_RECURSOS'],
  EN_REVISION_RECURSOS: [
    'PENDIENTE_APROBACION_SUFICIENCIA',
    'RECHAZA_RECURSOS',
  ],
  PENDIENTE_APROBACION_SUFICIENCIA: [
    'APRUEBA_SUFICIENCIA',
    'RECHAZA_SUFICIENCIA',
  ],
  RECHAZA_LIDER: [],
  RECHAZA_SUFICIENCIA: [],
  RECHAZA_RECURSOS: [],
  APRUEBA_SUFICIENCIA: [],
};

const assertNonEmpty = (value: string, field: string): void => {
  if (!value || !value.trim()) {
    throw new InvalidFieldError(field, 'es obligatorio');
  }
};

const assertNonNegative = (value: number, field: string): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new InvalidAmountError(field, 'debe ser un número mayor o igual a 0');
  }
};

function assertValidStatus(value: string): asserts value is RequestStatus {
  if (!(REQUEST_STATUSES as readonly string[]).includes(value)) {
    throw new InvalidFieldError('status', `valor desconocido '${value}'`);
  }
}

function assertValidPurchaseType(value: string): asserts value is PurchaseType {
  if (!(PURCHASE_TYPES as readonly string[]).includes(value)) {
    throw new InvalidFieldError('purchaseType', `valor desconocido '${value}'`);
  }
}

const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export class PurchaseRequest {
  readonly id?: PurchaseRequestID;
  readonly requestNumber?: number;
  readonly requestedBy: string;
  readonly isoId: number;
  readonly justification: string;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  private _purchaseType: PurchaseType | null;
  private _status: RequestStatus;
  private _totalAmountEstimated: number;
  private _totalAmountFinal: number;

  private readonly _requestComponents: RequestComponent[];
  private readonly _productItems: ProductItem[];

  private constructor(props: PurchaseRequestProps) {
    this.id = props.id;
    this.requestNumber = props.requestNumber;
    this.requestedBy = props.requestedBy;
    this.isoId = props.isoId;
    this.justification = props.justification;
    this._status = props.status ?? 'SOLICITADO';
    this._purchaseType = props.purchaseType ?? null;
    this._totalAmountEstimated = props.totalAmountEstimated ?? 0;
    this._totalAmountFinal = props.totalAmountFinal ?? 0;
    this._requestComponents = [...(props.requestComponents ?? [])];
    this._productItems = [...(props.productItems ?? [])];
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: CreatePurchaseRequestProps): PurchaseRequest {
    assertNonEmpty(props.requestedBy, 'requestedBy');
    assertNonEmpty(props.justification, 'justification');

    // 1. Validaciones de existencia (Al menos 1 de cada uno)
    if (!props.requestComponents || props.requestComponents.length === 0) {
      throw new MissingRequestComponentsError();
    }
    if (!props.productItems || props.productItems.length === 0) {
      throw new MissingProductItemsError();
    }

    const request = new PurchaseRequest({
      requestedBy: props.requestedBy,
      justification: props.justification,
      isoId: props.isoId,
      status: 'SOLICITADO',
      purchaseType: undefined,
      totalAmountEstimated: 0,
      totalAmountFinal: 0,
    });

    for (const component of props.requestComponents) {
      request.addRequestComponent(component);
    }
    for (const item of props.productItems) {
      request.addProductItem(item); // Esto recalcula el _totalAmountEstimated
    }

    // 2. Validación de Consistencia (El triángulo de montos)
    request.validateEstimatedAmounts();

    return request;
  }

  static rehydrate(props: PurchaseRequestProps): PurchaseRequest {
    assertNonEmpty(props.requestedBy, 'requestedBy');
    assertNonEmpty(props.justification, 'justification');
    if (props.purchaseType) assertValidPurchaseType(props.purchaseType);
    assertValidStatus(props.status ?? 'SOLICITADO');
    assertNonNegative(props.totalAmountEstimated ?? 0, 'totalAmountEstimated');
    assertNonNegative(props.totalAmountFinal ?? 0, 'totalAmountFinal');

    return new PurchaseRequest({
      ...props,
      status: props.status ?? 'SOLICITADO',
    });
  }

  get status(): RequestStatus {
    return this._status;
  }
  get totalAmountEstimated(): number {
    return this._totalAmountEstimated;
  }
  get totalAmountFinal(): number {
    return this._totalAmountFinal;
  }
  get requestComponents(): readonly RequestComponent[] {
    return this._requestComponents;
  }
  get productItems(): readonly ProductItem[] {
    return this._productItems;
  }
  get purchaseType(): PurchaseType | null {
    return this._purchaseType;
  }

  addRequestComponent(component: RequestComponent): void {
    if (this.id) {
      throw new InvalidFieldError(
        'requestComponents',
        'no se pueden agregar componentes a una solicitud ya guardada',
      );
    }

    const duplicated = this._requestComponents.some(
      (current) =>
        current.componentId === component.componentId &&
        current.activityId === component.activityId,
    );

    if (duplicated) {
      throw new DuplicatedRequestComponentError(
        component.componentId,
        component.activityId,
      );
    }

    this._requestComponents.push(component);
  }

  addProductItem(item: ProductItem): void {
    if (this.id)
      throw new InvalidFieldError(
        'productItems',
        'no se pueden agregar productos a una solicitud ya guardada',
      );

    if (
      this.id &&
      item.purchaseRequestId &&
      item.purchaseRequestId !== this.id
    ) {
      throw new InvalidFieldError(
        'purchaseRequestId',
        'el producto pertenece a otra solicitud',
      );
    }

    this._productItems.push(item);
    this.recalculateTotals();
  }

  updateProductItemFinalAmount(itemId: string, newAmount: number): void {
    const item = this._productItems.find((p) => p.id === itemId);
    if (!item) {
      throw new ProductItemNotFoundError(itemId);
    }
    item.updateFinalAmount(newAmount);
    this.recalculateTotals();
  }

  updateRequestComponentFinalAmount(
    componentId: number,
    activityId: number,
    newAmount: number,
  ): void {
    const component = this._requestComponents.find(
      (c) => c.componentId === componentId && c.activityId === activityId,
    );

    if (!component) {
      throw new RequestComponentNotFoundError(componentId, activityId);
    }

    component.updateFinalAmount(newAmount);
  }

  // ==========================================
  // MÉTODOS DE FLUJO DE NEGOCIO
  // ==========================================
  approveByLeader(): void {
    this.changeStatus('APRUEBA_LIDER');
  }
  rejectByLeader(): void {
    this.changeStatus('RECHAZA_LIDER');
  }
  authorizeBySufficiency(): void {
    this.changeStatus('AUTORIZA_SUFICIENCIA');
  }
  rejectBySufficiency(): void {
    this.changeStatus('RECHAZA_SUFICIENCIA');
  }
  sendToResources(): void {
    this.changeStatus('EN_REVISION_RECURSOS');
  }
  rejectByResources(): void {
    this.changeStatus('RECHAZA_RECURSOS');
  }
  finishMarketStudy(): void {
    this.changeStatus('PENDIENTE_APROBACION_SUFICIENCIA');
  }
  approveBySufficiency(): void {
    this.changeStatus('APRUEBA_SUFICIENCIA');
  }

  // ==========================================
  // MÉTODOS PRIVADOS
  // ==========================================

  private changeStatus(nextStatus: RequestStatus): void {
    const allowed = ALLOWED_STATUS_TRANSITIONS[this._status];
    if (!allowed.includes(nextStatus)) {
      throw new InvalidStatusTransitionError(this._status, nextStatus);
    }
    this._status = nextStatus;
  }

  private recalculateTotals(): void {
    // Ahora los productos ya traen su importe final, no se multiplica por quantity
    this._totalAmountEstimated = roundMoney(
      this._productItems.reduce((sum, item) => sum + item.estimatedAmount, 0),
    );

    this._totalAmountFinal = roundMoney(
      this._productItems.reduce((sum, item) => sum + item.finalAmount, 0),
    );
  }

  private validateEstimatedAmounts(): void {
    const sumProducts = roundMoney(
      this._productItems.reduce((sum, item) => sum + item.estimatedAmount, 0),
    );

    const sumComponents = roundMoney(
      this._requestComponents.reduce(
        (sum, comp) => sum + comp.estimatedAmount,
        0,
      ),
    );

    const tolerance = 0.01;

    // Productos vs Solicitud Total
    if (Math.abs(sumProducts - this._totalAmountEstimated) > tolerance) {
      throw new ProductsAmountMismatchError(
        sumProducts,
        this._totalAmountEstimated,
      );
    }

    // Componentes vs Solicitud Total
    if (Math.abs(sumComponents - this._totalAmountEstimated) > tolerance) {
      throw new ComponentsAmountMismatchError(
        sumComponents,
        this._totalAmountEstimated,
      );
    }
  }
}
