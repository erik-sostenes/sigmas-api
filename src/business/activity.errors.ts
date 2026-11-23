export abstract class ActivityDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidActivityError extends ActivityDomainError {}

export class InvalidActivityFieldError extends InvalidActivityError {
  constructor(field: string, reason: string) {
    super(`El campo '${field}' es inválido: ${reason}`);
  }
}
