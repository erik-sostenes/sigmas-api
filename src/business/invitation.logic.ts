import { Injectable } from '@nestjs/common';
import { Invitation } from './invitation.model';
import {
  InvitationCatalogRepositoryI,
  InvitationLogicI,
  InvitationRepositoryI,
} from './invitation.ports';
import { LIDER_ACTIVIDAD_ROLE_CODE } from './user-assignment.model';
import {
  InvalidInvitationActivitiesRoleError,
  InvalidInvitationError,
  InvitationActivitiesNotFoundError,
  InvitationActivityAlreadyHasLeaderError,
  InvitationDepartmentNotFoundError,
  InvitationRoleIdsNotFoundError,
  InvitationRolesNotFoundError,
  InvitationUserAlreadyExistsError,
  LeaderInvitationRequiresActivitiesError,
} from './invitation.errors';

@Injectable()
export class InvitationLogic implements InvitationLogicI {
  constructor(
    private readonly invitationRepository: InvitationRepositoryI,
    private readonly catalogRepository: InvitationCatalogRepositoryI,
  ) {}

  async send(invitation: Invitation): Promise<void> {
    if (!invitation.firstName || !invitation.lastName) {
      throw new InvalidInvitationError(
        'El nombre y el apellido son obligatorios.',
      );
    }

    const hasRoleIds = invitation.roleIds.length > 0;
    const hasRoleCodes = invitation.roleCodes.length > 0;

    if (!hasRoleIds && !hasRoleCodes) {
      throw new InvalidInvitationError(
        'Debes especificar al menos un rol (usando roleIds o roleCodes).',
      );
    }

    if (hasRoleIds) {
      if (invitation.roleIds.some((id) => !Number.isInteger(id) || id < 1)) {
        throw new InvalidInvitationError(
          'Todos los IDs de rol deben ser números enteros positivos.',
        );
      }

      if (new Set(invitation.roleIds).size !== invitation.roleIds.length) {
        throw new InvalidInvitationError(
          'La lista de roleIds no debe contener identificadores duplicados.',
        );
      }

      const foundRoles = await this.catalogRepository.findRolesByIds(
        invitation.roleIds,
      );
      const foundIdMap = new Map(foundRoles.map((r) => [r.id, r]));

      const missingRoleIds = invitation.roleIds.filter(
        (id) => !foundIdMap.has(id),
      );
      if (missingRoleIds.length > 0) {
        throw new InvitationRoleIdsNotFoundError(missingRoleIds);
      }

      invitation.roleCodes = foundRoles.map((r) => r.code);
    } else {
      if (invitation.roleCodes.some((code) => code.length === 0)) {
        throw new InvalidInvitationError(
          'Debes especificar al menos un código de rol válido.',
        );
      }

      if (new Set(invitation.roleCodes).size !== invitation.roleCodes.length) {
        throw new InvalidInvitationError(
          'La lista de roles no debe contener códigos duplicados.',
        );
      }

      const foundRoles = await this.catalogRepository.findRolesByCodes(
        invitation.roleCodes,
      );
      const foundCodeMap = new Map(foundRoles.map((r) => [r.code, r]));

      const missingRoleCodes = invitation.roleCodes.filter(
        (code) => !foundCodeMap.has(code),
      );
      if (missingRoleCodes.length > 0) {
        throw new InvitationRolesNotFoundError(missingRoleCodes);
      }

      invitation.roleIds = foundRoles.map((r) => r.id);
    }

    if (
      new Set(invitation.activityIds).size !== invitation.activityIds.length
    ) {
      throw new InvalidInvitationError(
        'La lista de actividades no debe contener IDs duplicados.',
      );
    }

    if (invitation.activityIds.some((id) => !Number.isInteger(id) || id <= 0)) {
      throw new InvalidInvitationError(
        'Cada ID de actividad debe ser un entero positivo.',
      );
    }

    if (invitation.activityCodes.some((code) => code.length === 0)) {
      throw new InvalidInvitationError(
        'Los códigos de actividad no pueden estar vacíos.',
      );
    }

    if (
      new Set(invitation.activityCodes).size !== invitation.activityCodes.length
    ) {
      throw new InvalidInvitationError(
        'La lista de actividades no debe contener códigos duplicados.',
      );
    }

    const hasActivities =
      invitation.activityIds.length > 0 || invitation.activityCodes.length > 0;

    const isActivityLeader = invitation.roleCodes.includes(
      LIDER_ACTIVIDAD_ROLE_CODE,
    );

    if (!isActivityLeader && hasActivities) {
      throw new InvalidInvitationActivitiesRoleError();
    }

    if (isActivityLeader && !hasActivities) {
      throw new LeaderInvitationRequiresActivitiesError();
    }

    const emailAlreadyExists = await this.catalogRepository.existsUserByEmail(
      invitation.email,
    );
    if (emailAlreadyExists) {
      throw new InvitationUserAlreadyExistsError(invitation.email);
    }

    const departmentExists =
      await this.catalogRepository.existsActiveDepartment(
        invitation.departmentId,
      );
    if (!departmentExists) {
      throw new InvitationDepartmentNotFoundError(invitation.departmentId);
    }

    if (invitation.activityIds.length > 0) {
      const existingActivities =
        await this.catalogRepository.findActivitiesByIds(
          invitation.activityIds,
        );
      const activityById = new Map(
        existingActivities.map((item) => [item.id, item]),
      );

      const missingActivityIds = invitation.activityIds.filter(
        (id) => !activityById.has(id),
      );
      if (missingActivityIds.length > 0) {
        throw new InvitationActivitiesNotFoundError(
          missingActivityIds.map(String),
        );
      }

      const conflicts = existingActivities
        .filter((item) => item.leaderId !== null)
        .map((item) => ({
          activityCode: item.code,
          currentLeaderId: item.leaderId as string,
          currentLeaderEmail: item.leaderEmail ?? null,
        }));

      if (conflicts.length > 0) {
        throw new InvitationActivityAlreadyHasLeaderError(conflicts);
      }
    } else if (invitation.activityCodes.length > 0) {
      const existingActivities =
        await this.catalogRepository.findActivitiesByCodes(
          invitation.activityCodes,
        );
      const activityByCode = new Map(
        existingActivities.map((item) => [item.code, item]),
      );

      const missingActivityCodes = invitation.activityCodes.filter(
        (code) => !activityByCode.has(code),
      );
      if (missingActivityCodes.length > 0) {
        throw new InvitationActivitiesNotFoundError(missingActivityCodes);
      }

      const conflicts = existingActivities
        .filter((item) => item.leaderId !== null)
        .map((item) => ({
          activityCode: item.code,
          currentLeaderId: item.leaderId as string,
          currentLeaderEmail: item.leaderEmail ?? null,
        }));

      if (conflicts.length > 0) {
        throw new InvitationActivityAlreadyHasLeaderError(conflicts);
      }

      invitation.activityIds = existingActivities.map((item) => item.id);
    }

    await this.invitationRepository.sendClerkInvitation(invitation);
  }
}
