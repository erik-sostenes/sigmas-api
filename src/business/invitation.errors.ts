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

export class InvitationDepartmentNotFoundError extends Error {
  constructor(departmentId: number) {
    super(
      `El departamento con ID ${departmentId} no existe o no se encuentra activo.`,
    );
    this.name = 'InvitationDepartmentNotFoundError';
  }
}

export class InvitationRolesNotFoundError extends Error {
  readonly missingRoleCodes: string[];

  constructor(missingRoleCodes: string[]) {
    super(
      `Los siguientes códigos de rol no existen: ${missingRoleCodes.join(', ')}.`,
    );
    this.name = 'InvitationRolesNotFoundError';
    this.missingRoleCodes = missingRoleCodes;
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
  readonly missingActivityCodes: string[];

  constructor(missingActivityCodes: string[]) {
    super(
      `Las siguientes actividades no existen: ${missingActivityCodes.join(', ')}.`,
    );
    this.name = 'InvitationActivitiesNotFoundError';
    this.missingActivityCodes = missingActivityCodes;
  }
}

export class InvalidInvitationActivitiesRoleError extends Error {
  constructor() {
    super(
      "Solo se pueden asignar actividades cuando la invitación incluye el rol 'lider_actividad'.",
    );
    this.name = 'InvalidInvitationActivitiesRoleError';
  }
}

export class LeaderInvitationRequiresActivitiesError extends Error {
  constructor() {
    super(
      "El rol 'lider_actividad' requiere seleccionar al menos una actividad.",
    );
    this.name = 'LeaderInvitationRequiresActivitiesError';
  }
}

export interface InvitationActivityConflictItem {
  activityCode: string;
  currentLeaderId: string;
  currentLeaderEmail: string | null;
}

export class InvitationActivityAlreadyHasLeaderError extends Error {
  readonly conflicts: InvitationActivityConflictItem[];

  constructor(conflicts: InvitationActivityConflictItem[]) {
    const detail = conflicts
      .map((item) =>
        item.currentLeaderEmail
          ? `${item.activityCode} (líder actual: ${item.currentLeaderEmail})`
          : `${item.activityCode} (líder actual: ${item.currentLeaderId})`,
      )
      .join(', ');
    super(
      `No se puede enviar la invitación porque las siguientes actividades ya tienen un líder asignado: ${detail}.`,
    );
    this.name = 'InvitationActivityAlreadyHasLeaderError';
    this.conflicts = conflicts;
  }
}

export class ClerkInvitationError extends Error {
  constructor(message: string) {
    super(`Error al enviar la invitación: ${message}`);
    this.name = 'ClerkInvitationError';
  }
}
