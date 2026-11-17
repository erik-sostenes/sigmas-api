export class InvalidPurchaseRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPurchaseRequestError';
  }
}

export class PurchaseRequesterNotFoundError extends Error {
  constructor(userId: string) {
    super(`El usuario solicitante ${userId} no existe.`);
    this.name = 'PurchaseRequesterNotFoundError';
  }
}

export class PurchaseRequestNotCreatedError extends Error {
  constructor() {
    super('No se pudo crear la solicitud de compra.');
    this.name = 'PurchaseRequestNotCreatedError';
  }
}

export class PurchaseRequestIsosNotFoundError extends Error {
  constructor(isoIds: number[]) {
    super(`Las siguientes normas ISO no existen: ${isoIds.join(', ')}.`);
    this.name = 'PurchaseRequestIsosNotFoundError';
  }
}
