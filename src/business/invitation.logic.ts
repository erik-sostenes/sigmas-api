import { Injectable } from '@nestjs/common';
import { Invitation } from './invitation.model';
import {
  InvitationLogicI,
  InvitationRepositoryI,
  ClerkInvitationRepositoryI,
} from './invitation.ports';
import { DepartmentRepositoryI } from './department.ports';
import { ComponentRepositoryI } from './component.ports';
import { RoleRepositoryI } from './role.ports';
import { ActivityRepositoryI } from './activity.ports';
import { UserRepositoryI } from './user.ports';
import {
  InvitationUserAlreadyExistsError,
  InvitationAlreadyPendingError,
  InvitationDepartmentNotFoundError,
  InvitationComponentNotFoundError,
  InvitationComponentAlreadyHasLeaderError,
  InvitationRoleIdsNotFoundError,
  InvitationActivitiesNotFoundError,
  InvalidInvitationActivitiesRoleError,
  InvitationRequiresActivitiesError,
  InvitationComponentRoleMismatchError,
  InvitationActivityAlreadyHasLeaderError,
  InvitationNotFoundError,
} from './invitation.errors';

@Injectable()
export class InvitationLogic implements InvitationLogicI {
  constructor(
    private readonly invitationRepository: InvitationRepositoryI,
    private readonly clerkRepository: ClerkInvitationRepositoryI,
    private readonly userRepository: UserRepositoryI,
    private readonly departmentRepository: DepartmentRepositoryI,
    private readonly componentRepository: ComponentRepositoryI,
    private readonly roleRepository: RoleRepositoryI,
    private readonly activityRepository: ActivityRepositoryI,
  ) {}

  async send(invitation: Invitation): Promise<void> {
    if (await this.userRepository.existsByEmail(invitation.email)) {
      throw new InvitationUserAlreadyExistsError(invitation.email);
    }
    if (await this.invitationRepository.existsByEmail(invitation.email)) {
      throw new InvitationAlreadyPendingError(invitation.email);
    }

    if (!(await this.departmentRepository.exists(invitation.departmentId))) {
      throw new InvitationDepartmentNotFoundError(invitation.departmentId);
    }

    // 3. Validar Componente
    if (invitation.componentId !== null) {
      if (!(await this.componentRepository.exists(invitation.componentId))) {
        throw new InvitationComponentNotFoundError(invitation.componentId);
      }
      if (
        await this.invitationRepository.hasComponentLeader(
          invitation.componentId,
        )
      ) {
        throw new InvitationComponentAlreadyHasLeaderError(
          invitation.componentId,
        );
      }
    }

    const roles = await this.roleRepository.findByIds(invitation.roleIds);
    if (roles.length !== invitation.roleIds.length) {
      const foundIds = new Set(roles.map((r) => r.id));
      const missingRoleIds = invitation.roleIds.filter(
        (id) => !foundIds.has(id),
      );
      throw new InvitationRoleIdsNotFoundError(missingRoleIds);
    }

    const requiresComponent = roles.some((r) => r.requiresComponent);
    const hasComponent = invitation.componentId !== null;

    if (requiresComponent !== hasComponent) {
      throw new InvitationComponentRoleMismatchError();
    }

    // 6. Regla de actividades y roles
    const requiresActivities = roles.some((r) => r.requiresActivities);
    const hasActivities = invitation.activityIds.length > 0;

    if (requiresActivities && !hasActivities) {
      throw new InvitationRequiresActivitiesError();
    }
    if (!requiresActivities && hasActivities) {
      throw new InvalidInvitationActivitiesRoleError();
    }

    // 7. Validar Actividades (existencia y líderes)
    if (hasActivities) {
      const activities = await this.activityRepository.findByIds(
        invitation.activityIds,
      );
      if (activities.length !== invitation.activityIds.length) {
        const foundIds = new Set(activities.map((a) => a.id));
        const missingActivityIds = invitation.activityIds.filter(
          (id) => !foundIds.has(id),
        );
        throw new InvitationActivitiesNotFoundError(missingActivityIds);
      }

      if (
        await this.invitationRepository.hasActivityLeader(
          invitation.activityIds,
        )
      ) {
        const conflicts = invitation.activityIds.map((id) => ({
          activityId: id,
        }));
        throw new InvitationActivityAlreadyHasLeaderError(conflicts);
      }
    }

    // 8. Guardar en BD
    const dbId = await this.invitationRepository.save(invitation);

    // 9. Enviar a Clerk y actualizar con el clerk_invitation_id
    const clerkInvitationId =
      await this.clerkRepository.sendClerkInvitation(invitation);

    await this.invitationRepository.save(
      Invitation.rehydrate({
        ...invitation,
        id: dbId,
        clerkInvitationId,
      }),
    );
  }

  async cancel(invitationId: string): Promise<void> {
    const invitation = await this.invitationRepository.findById(invitationId);
    if (!invitation) {
      throw new InvitationNotFoundError(invitationId);
    }

    if (invitation.clerkInvitationId) {
      await this.clerkRepository.revokeClerkInvitation(
        invitation.clerkInvitationId,
      );
    }
    await this.invitationRepository.delete(invitationId);
  }
}
