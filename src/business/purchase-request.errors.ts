export abstract class PurchaseRequestDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidPurchaseRequestError extends PurchaseRequestDomainError {}

export class IsoNotFoundError extends PurchaseRequestDomainError {
  constructor(public readonly isoId: number) {
    super(`La ISO con id ${isoId} no existe.`);
    this.name = 'IsoNotFoundError';
  }
}

export class ComponentReferenceNotFoundError extends PurchaseRequestDomainError {
  constructor(
    public readonly field: 'component' | 'activity' | 'fundingSource',
    public readonly id: number,
  ) {
    super(`La referencia ${field} con id ${id} no existe.`);
    this.name = 'ComponentReferenceNotFoundError';
  }
}

export class ProductReferenceNotFoundError extends PurchaseRequestDomainError {
  constructor(
    public readonly field: 'budgetItem' | 'measurementUnit',
    public readonly id: number,
  ) {
    super(`La referencia ${field} con id ${id} no existe.`);
    this.name = 'ProductReferenceNotFoundError';
  }
}

export class PurchaseRequestAlreadyPersistedError extends Error {
  constructor() {
    super('La solicitud ya fue persistida; usa update() en su lugar.');
    this.name = 'PurchaseRequestAlreadyPersistedError';
  }
}
export class PurchaseRequesterNotFoundError extends PurchaseRequestDomainError {
  constructor(userId: string) {
    super(`El usuario solicitante ${userId} no existe.`);
  }
}
export class PurchaseRequestNotCreatedError extends PurchaseRequestDomainError {
  constructor() {
    super('No se pudo crear la solicitud de compra.');
  }
}
export class InvalidFieldError extends InvalidPurchaseRequestError {
  constructor(field: string, reason: string) {
    super(`El campo '${field}' es inválido: ${reason}`);
  }
}
export class InvalidAmountError extends InvalidPurchaseRequestError {
  constructor(field: string, reason: string) {
    super(`El monto en '${field}' es inválido: ${reason}`);
  }
}

export class FinalAmountsMismatchError extends PurchaseRequestDomainError {
  constructor(
    public readonly componentsTotal: number,
    public readonly productsTotal: number,
  ) {
    super(
      `La suma de montos finales de componentes (${componentsTotal}) ` +
        `no coincide con la de productos (${productsTotal}).`,
    );
    this.name = 'FinalAmountsMismatchError';
  }
}

export class FinalAmountNotAllowedOnCreateError extends PurchaseRequestDomainError {
  constructor(scope: string) {
    super(`No se permite finalAmount ≠ 0 al crear la solicitud (${scope}).`);
    this.name = 'FinalAmountNotAllowedOnCreateError';
  }
}

export class InvalidStatusTransitionError extends InvalidPurchaseRequestError {
  constructor(currentStatus: string, nextStatus: string) {
    super(
      `Transición de estatus no permitida: de '${currentStatus}' a '${nextStatus}'.`,
    );
  }
}

export class DuplicatedRequestComponentError extends PurchaseRequestDomainError {
  constructor(
    public readonly componentId: number,
    public readonly activityId: number,
  ) {
    super(
      `El componente ${componentId} ya está asociado a la actividad ${activityId} en esta solicitud.`,
    );
    this.name = 'DuplicatedRequestComponentError';
  }
}

export class ProductItemNotFoundError extends PurchaseRequestDomainError {
  constructor(itemId: string) {
    super(`El producto con ID '${itemId}' no existe en esta solicitud.`);
  }
}

export class RequestComponentNotFoundError extends PurchaseRequestDomainError {
  constructor(
    public readonly componentId: number,
    public readonly activityId: number,
  ) {
    super(
      `No existe el componente ${componentId} con la actividad ${activityId} en esta solicitud.`,
    );
    this.name = 'RequestComponentNotFoundError';
  }
}

export class MissingRequestComponentsError extends InvalidPurchaseRequestError {
  constructor() {
    super('La solicitud debe tener al menos un componente.');
  }
}

export class MissingProductItemsError extends InvalidPurchaseRequestError {
  constructor() {
    super('La solicitud debe tener al menos un producto.');
  }
}

export class ComponentsAmountMismatchError extends InvalidPurchaseRequestError {
  constructor(sumComponents: number, totalRequest: number) {
    super(
      `La suma de los montos estimados de los componentes ($${sumComponents.toFixed(2)}) no coincide con el total de la solicitud ($${totalRequest.toFixed(2)}).`,
    );
  }
}

export class ProductsAmountMismatchError extends InvalidPurchaseRequestError {
  constructor(sumProducts: number, totalRequest: number) {
    super(
      `La suma de los importes de los productos ($${sumProducts.toFixed(2)}) no coincide con el total de la solicitud ($${totalRequest.toFixed(2)}).`,
    );
  }
}
