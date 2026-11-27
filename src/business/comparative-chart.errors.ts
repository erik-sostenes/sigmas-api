export abstract class ComparativeChartDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ComparativeChartNotFoundError extends ComparativeChartDomainError {
  constructor(id: string) {
    super(`El cuadro comparativo '${id}' no existe.`);
  }
}

export class ComparativeChartAlreadyExistsError extends ComparativeChartDomainError {
  constructor() {
    super('Esta solicitud ya tiene un cuadro comparativo guardado.');
  }
}

export class ComparativeChartReadOnlyError extends ComparativeChartDomainError {
  constructor(status: string) {
    super(
      `El cuadro comparativo es de solo lectura porque la solicitud está en estado '${status}'.`,
    );
  }
}

export class ComparativeChartRequestInvalidError extends ComparativeChartDomainError {
  constructor(message: string) {
    super(message);
  }
}

export class ComparativeChartProviderInvalidError extends ComparativeChartDomainError {
  constructor(message: string) {
    super(message);
  }
}

export class ComparativeChartValidationError extends ComparativeChartDomainError {
  constructor(message: string) {
    super(message);
  }
}
