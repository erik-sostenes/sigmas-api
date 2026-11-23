export abstract class AdministrativeUnitDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidAdministrativeUnitError extends AdministrativeUnitDomainError {}

export class InvalidAdministrativeUnitFieldError extends InvalidAdministrativeUnitError {
  constructor(field: string, reason: string) {
    super(`El campo '${field}' es inválido: ${reason}`);
  }
}

export class AdministrativeUnitNotPersistedError extends AdministrativeUnitDomainError {
  constructor() {
    super(
      'La unidad administrativa debe estar persistida (con id) antes de asociarse a un componente.',
    );
  }
}
