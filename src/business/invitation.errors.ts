export class InvalidInvitationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInvitationError';
  }
}

export class InvitationUserAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`Ya existe un usuario registrado con el correo '${email}'.`);
    this.name = 'InvitationUserAlreadyExistsError';
  }
}

export class InvitationAlreadyPendingError extends Error {
  constructor(email: string) {
    super(`Ya existe una invitación pendiente para el correo '${email}'.`);
    this.name = 'InvitationAlreadyPendingError';
  }
}

export class InvitationDepartmentNotFoundError extends Error {
  constructor(departmentId: number) {
    super(
      `El departamento con ID ${departmentId} no existe o no se encuentra activo.`,
    );
    this.name = 'InvitationDepartmentNotFoundError';
  }
}

export class InvitationComponentNotFoundError extends Error {
  constructor(componentId: number) {
    super(`El componente con ID ${componentId} no existe.`);
    this.name = 'InvitationComponentNotFoundError';
  }
}

export class InvitationComponentAlreadyHasLeaderError extends Error {
  constructor(componentId: number) {
    super(
      `El componente con ID ${componentId} ya tiene un líder asignado (en usuarios o en otra invitación).`,
    );
    this.name = 'InvitationComponentAlreadyHasLeaderError';
  }
}

export class InvitationRoleIdsNotFoundError extends Error {
  readonly missingRoleIds: number[];

  constructor(missingRoleIds: number[]) {
    super(
      `Los siguientes IDs de rol no existen: ${missingRoleIds.join(', ')}.`,
    );
    this.name = 'InvitationRoleIdsNotFoundError';
    this.missingRoleIds = missingRoleIds;
  }
}

export class InvitationActivitiesNotFoundError extends Error {
  readonly missingActivityIds: number[];

  constructor(missingActivityIds: number[]) {
    super(
      `Las siguientes actividades no existen: ${missingActivityIds.join(', ')}.`,
    );
    this.name = 'InvitationActivitiesNotFoundError';
    this.missingActivityIds = missingActivityIds;
  }
}

// Errores de reglas de negocio cruzadas
export class InvalidInvitationActivitiesRoleError extends Error {
  constructor() {
    super(
      'Solo se pueden asignar actividades cuando el rol seleccionado las requiere.',
    );
    this.name = 'InvalidInvitationActivitiesRoleError';
  }
}

export class InvitationRequiresActivitiesError extends Error {
  constructor() {
    super('El rol seleccionado requiere asignar al menos una actividad.');
    this.name = 'InvitationRequiresActivitiesError';
  }
}

export class InvitationComponentRoleMismatchError extends Error {
  constructor() {
    super(
      "Si asigna un componente, es obligatorio incluir el rol 'lider_componente'. Y viceversa.",
    );
    this.name = 'InvitationComponentRoleMismatchError';
  }
}

export interface InvitationActivityConflictItem {
  activityId: number;
}

export class InvitationActivityAlreadyHasLeaderError extends Error {
  readonly conflicts: InvitationActivityConflictItem[];

  constructor(conflicts: InvitationActivityConflictItem[]) {
    const detail = conflicts.map((item) => `ID ${item.activityId}`).join(', ');
    super(
      `No se puede enviar la invitación porque las siguientes actividades ya tienen un líder: ${detail}.`,
    );
    this.name = 'InvitationActivityAlreadyHasLeaderError';
    this.conflicts = conflicts;
  }
}

export class InvitationNotFoundError extends Error {
  constructor(id: string) {
    super(`La invitación con ID '${id}' no existe.`);
    this.name = 'InvitationNotFoundError';
  }
}

export class ClerkInvitationError extends Error {
  constructor(message: string) {
    super(`Error al interactuar con Clerk: ${message}`);
    this.name = 'ClerkInvitationError';
  }
}
