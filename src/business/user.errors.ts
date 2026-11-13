export abstract class UserDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidUserError extends UserDomainError {}

export class InvalidUserFieldError extends InvalidUserError {
  constructor(field: string, reason: string) {
    super(`El campo '${field}' es inválido: ${reason}`);
  }
}

export class InvalidUserComponentRoleError extends InvalidUserError {
  constructor() {
    super(
      'El rol seleccionado requiere un componente, o se envió un componente sin el rol correspondiente.',
    );
  }
}

export class InvalidUserActivitiesRoleError extends InvalidUserError {
  constructor() {
    super(
      'Solo se pueden asignar actividades cuando el rol seleccionado las requiere.',
    );
  }
}

export class LeaderUserRequiresActivitiesError extends InvalidUserError {
  constructor() {
    super('El rol seleccionado requiere asignar al menos una actividad.');
  }
}

export class ComponentAlreadyHasLeaderError extends UserDomainError {
  constructor(componentId: number, currentLeaderId: string) {
    super(
      `El componente con ID ${componentId} ya tiene un líder asignado (ID: ${currentLeaderId}).`,
    );
  }
}

export class UserDepartmentNotFoundError extends UserDomainError {
  constructor(departmentId: number) {
    super(`El departamento con ID ${departmentId} no existe.`);
  }
}

export class UserComponentNotFoundError extends UserDomainError {
  constructor(componentId: number) {
    super(`El componente con ID ${componentId} no existe.`);
  }
}

export class UserRolesNotFoundError extends UserDomainError {
  constructor(missingRoleIds: string[]) {
    super(
      `Los siguientes IDs de rol no existen: ${missingRoleIds.join(', ')}.`,
    );
  }
}

export class UserActivitiesNotFoundError extends UserDomainError {
  constructor(missingActivityIds: string[]) {
    super(
      `Los siguientes IDs de actividad no existen: ${missingActivityIds.join(', ')}.`,
    );
  }
}

export interface ActivityLeaderConflictItem {
  activityId: number;
  currentLeaderId: string;
  currentLeaderEmail: string | null;
}

export class ActivityAlreadyHasLeaderError extends UserDomainError {
  readonly conflicts: ActivityLeaderConflictItem[];
  constructor(conflicts: ActivityLeaderConflictItem[]) {
    const detail = conflicts
      .map(
        (c) =>
          `Actividad ID ${c.activityId} (Líder actual: ${c.currentLeaderEmail || c.currentLeaderId})`,
      )
      .join(', ');
    super(
      `Conflicto de asignación: las siguientes actividades ya pertenecen a otro líder: ${detail}.`,
    );
    this.conflicts = conflicts;
  }
}

export class UserAlreadyExistsError extends UserDomainError {
  constructor(email: string) {
    super(`El usuario con correo '${email}' ya está registrado.`);
  }
}

export class UserEmailConflictError extends UserDomainError {
  constructor(email: string) {
    super(`El correo '${email}' ya está asociado a otra cuenta.`);
  }
}

export class UserNotCreatedError extends UserDomainError {
  constructor() {
    super('No se pudo registrar el usuario en la base de datos.');
  }
}
