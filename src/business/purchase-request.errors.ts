export abstract class PurchaseRequestDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidPurchaseRequestError extends PurchaseRequestDomainError {}

export class PurchaseRequestIsosNotFoundError extends PurchaseRequestDomainError {
  constructor(public readonly missingIsoIds: number[]) {
    super(
      `Las siguientes normas ISO no existen: ${missingIsoIds.join(', ')}.`,
    );
    this.name = 'PurchaseRequestIsosNotFoundError';
  }
}

export class ComponentReferenceNotFoundError extends PurchaseRequestDomainError {
  constructor(
    public readonly field: 'component' | 'fundingSource',
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
    public readonly fundingSourceId: number,
  ) {
    super(
      `La actividad ${activityId} del componente ${componentId} ya tiene una fila con la fuente de financiamiento ${fundingSourceId} en esta solicitud.`,
    );
    this.name = 'DuplicatedRequestComponentError';
  }
}

export class ActivityWithoutLeaderError extends PurchaseRequestDomainError {
  constructor(public readonly activityId: number) {
    super(
      `La actividad ${activityId} no tiene un líder activo asignado; no se puede incluir en la solicitud.`,
    );
  }
}

export class ActivityNotInComponentError extends PurchaseRequestDomainError {
  constructor(
    public readonly activityId: number,
    public readonly componentId: number,
  ) {
    super(
      `La actividad ${activityId} no existe o no pertenece al componente ${componentId}.`,
    );
  }
}

export class ProductItemNotFoundError extends PurchaseRequestDomainError {
  constructor(itemId: string) {
    super(`El producto con ID '${itemId}' no existe en esta solicitud.`);
  }
}

// También cuando la fila existe pero no es del líder que decide: no se revela que existe.
export class RequestComponentNotFoundError extends PurchaseRequestDomainError {
  constructor(public readonly requestComponentId: string) {
    super(
      `La fila '${requestComponentId}' no existe en esta solicitud o no te corresponde.`,
    );
  }
}

export class LeaderRowAlreadyDecidedError extends PurchaseRequestDomainError {
  constructor(public readonly requestComponentId: string) {
    super(`La fila '${requestComponentId}' ya fue aprobada o rechazada.`);
  }
}

export class RequestNotAwaitingLeadersError extends PurchaseRequestDomainError {
  constructor(currentStatus: string) {
    super(
      `La solicitud ya no espera decisión de líderes (estatus actual: '${currentStatus}').`,
    );
  }
}

export class RejectionJustificationRequiredError extends InvalidPurchaseRequestError {
  constructor() {
    super('Todo rechazo debe incluir una justificación.');
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

export class PurchaseRequestAccessDeniedError extends PurchaseRequestDomainError {
  constructor(
    message = 'No tienes permiso para consultar solicitudes.',
  ) {
    super(message);
  }
}

export class PurchaseRequestNotFoundError extends PurchaseRequestDomainError {
  constructor(id: string) {
    super(`La solicitud con id '${id}' no existe.`);
  }
}
