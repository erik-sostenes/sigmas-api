export abstract class ComponentDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidComponentError extends ComponentDomainError {}

export class InvalidComponentFieldError extends InvalidComponentError {
  constructor(field: string, reason: string) {
    super(`El campo '${field}' es inválido: ${reason}`);
  }
}
