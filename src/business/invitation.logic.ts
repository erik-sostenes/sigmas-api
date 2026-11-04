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
    if (
      invitation.roleCodes.length === 0 ||
      invitation.roleCodes.some((code) => code.length === 0)
    ) {
      throw new InvalidInvitationError(
        'Debes especificar al menos un código de rol válido.',
      );
    }

    if (new Set(invitation.roleCodes).size !== invitation.roleCodes.length) {
      throw new InvalidInvitationError(
        'La lista de roles no debe contener códigos duplicados.',
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

    const isActivityLeader = invitation.roleCodes.includes(
      LIDER_ACTIVIDAD_ROLE_CODE,
    );

    if (!isActivityLeader && invitation.activityCodes.length > 0) {
      throw new InvalidInvitationActivitiesRoleError();
    }

    if (isActivityLeader && invitation.activityCodes.length === 0) {
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

    const existingRoleCodes =
      await this.catalogRepository.findExistingRoleCodes(invitation.roleCodes);
    const existingRoleSet = new Set(existingRoleCodes);
    const missingRoleCodes = invitation.roleCodes.filter(
      (code) => !existingRoleSet.has(code),
    );
    if (missingRoleCodes.length > 0) {
      throw new InvitationRolesNotFoundError(missingRoleCodes);
    }

    if (invitation.activityCodes.length > 0) {
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
    }

    await this.invitationRepository.sendClerkInvitation(invitation);
  }
}
