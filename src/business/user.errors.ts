export class UserAlreadyExistsError extends Error {
  constructor(identifier: string) {
    super(
      `El usuario con identificador o correo '${identifier}' ya está registrado.`,
    );
    this.name = 'UserAlreadyExistsError';
  }
}

export class UserDepartmentNotFoundError extends Error {
  constructor(departmentId: number) {
    super(`El departamento con ID ${departmentId} no existe.`);
    this.name = 'UserDepartmentNotFoundError';
  }
}

export class UserNotCreatedError extends Error {
  constructor() {
    super('No se pudo registrar el usuario en la base de datos.');
    this.name = 'UserNotCreatedError';
  }
}
