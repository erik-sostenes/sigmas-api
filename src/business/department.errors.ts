export abstract class DepartmentDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidDepartmentError extends DepartmentDomainError {}

export class InvalidDepartmentFieldError extends InvalidDepartmentError {
  constructor(field: string, reason: string) {
    super(`El campo '${field}' es inválido: ${reason}`);
  }
}
