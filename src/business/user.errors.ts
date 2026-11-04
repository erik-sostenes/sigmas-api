export class UserAlreadyExistsError extends Error {
  constructor(identifier: string) {
    super(
      `El usuario con identificador o correo '${identifier}' ya está registrado.`,
    );
    this.name = 'UserAlreadyExistsError';
  }
}

export class UserEmailConflictError extends Error {
  constructor(email: string) {
    super(
      `El correo '${email}' ya está asociado a otra cuenta registrada en el sistema.`,
    );
    this.name = 'UserEmailConflictError';
  }
}

export class UserDepartmentNotFoundError extends Error {
  constructor(departmentId: number) {
    super(
      `El departamento con ID ${departmentId} no existe o no se encuentra activo.`,
    );
    this.name = 'UserDepartmentNotFoundError';
  }
}

export class UserRolesNotFoundError extends Error {
  readonly missingRoleCodes: string[];

  constructor(missingRoleCodes: string[]) {
    super(
      `Los siguientes códigos de rol no existen: ${missingRoleCodes.join(', ')}.`,
    );
    this.name = 'UserRolesNotFoundError';
    this.missingRoleCodes = missingRoleCodes;
  }
}

export class UserActivitiesNotFoundError extends Error {
  readonly missingActivityCodes: string[];

  constructor(missingActivityCodes: string[]) {
    super(
      `Las siguientes actividades no existen: ${missingActivityCodes.join(', ')}.`,
    );
    this.name = 'UserActivitiesNotFoundError';
    this.missingActivityCodes = missingActivityCodes;
  }
}

export class InvalidUserAssignmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidUserAssignmentError';
  }
}

export class InvalidUserActivitiesRoleError extends Error {
  constructor() {
    super(
      "Solo se pueden asignar actividades cuando el usuario incluye el rol 'lider_actividad'.",
    );
    this.name = 'InvalidUserActivitiesRoleError';
  }
}

export class LeaderUserRequiresActivitiesError extends Error {
  constructor() {
    super(
      "El rol 'lider_actividad' requiere asignar al menos una actividad al usuario.",
    );
    this.name = 'LeaderUserRequiresActivitiesError';
  }
}

export interface ActivityLeaderConflictItem {
  activityCode: string;
  currentLeaderId: string;
  currentLeaderEmail: string | null;
}

export class ActivityAlreadyHasLeaderError extends Error {
  readonly conflicts: ActivityLeaderConflictItem[];

  constructor(conflicts: ActivityLeaderConflictItem[]) {
    const detail = conflicts
      .map((item) =>
        item.currentLeaderEmail
          ? `${item.activityCode} (líder actual: ${item.currentLeaderEmail})`
          : `${item.activityCode} (líder actual: ${item.currentLeaderId})`,
      )
      .join(', ');
    super(
      `Conflicto de asignación: las siguientes actividades ya pertenecen a otro líder: ${detail}.`,
    );
    this.name = 'ActivityAlreadyHasLeaderError';
    this.conflicts = conflicts;
  }
}

export class UserNotCreatedError extends Error {
  constructor() {
    super('No se pudo registrar el usuario en la base de datos.');
    this.name = 'UserNotCreatedError';
  }
}
