import { Injectable } from '@nestjs/common';
import { User, UserId } from './user.model';
import { UserLogicI, UserRepositoryI } from './user.ports';
import { InvitationRepositoryI } from './invitation.ports';

@Injectable()
export class UserLogic implements UserLogicI {
  constructor(
    private readonly userRepository: UserRepositoryI,
    private readonly invitationRepository: InvitationRepositoryI,
  ) {}

  async createFromInvitation(
    clerkId: string,
    email: string,
  ): Promise<UserId | null> {
    // 1. Buscar la invitación
    const invitation = await this.invitationRepository.findByEmail(email);

    // Si no hay invitación, ignoramos el evento (ej. Super Admin creado desde Clerk)
    if (!invitation) {
      return null;
    }

    // 2. Armar la entidad User con los datos de la invitación
    const user = User.create({
      clerkId: clerkId,
      email: invitation.email,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      departmentId: invitation.departmentId,
      componentId: invitation.componentId,
      title: invitation.title,
      roleIds: invitation.roleIds,
      activityIds: invitation.activityIds,
    });

    // 3. Guardar en BD (UserMariaDBRepository ya hace las validaciones pesadas)
    const userId = await this.userRepository.save(user);

    // 4. Borrar la invitación (ya se usó)
    if (invitation.id) {
      await this.invitationRepository.delete(invitation.id);
    }

    return userId;
  }
}
