export abstract class RoleDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidRoleError extends RoleDomainError {}

export class InvalidRoleFieldError extends InvalidRoleError {
  constructor(field: string, reason: string) {
    super(`El campo '${field}' es inválido: ${reason}`);
  }
}
