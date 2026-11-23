import { Injectable } from '@nestjs/common';
import { User, UserId } from './user.model';
import {
  ClerkUserRepositoryI,
  UserLogicI,
  UserRepositoryI,
} from './user.ports';
import { InvitationRepositoryI } from './invitation.ports';
import {
  ClerkUserError,
  UserAlreadyExistsError,
  UserNotCreatedError,
  UserNotRegisteredError,
} from './user.errors';

@Injectable()
export class UserLogic implements UserLogicI {
  constructor(
    private readonly userRepository: UserRepositoryI,
    private readonly invitationRepository: InvitationRepositoryI,
    private readonly clerkUserRepository: ClerkUserRepositoryI,
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

  async getUsers(): Promise<User[]> {
    return await this.userRepository.findAll();
  }

  // Se llama al iniciar sesión: si Clerk registró al usuario pero el webhook
  // no llegó o falló, se crea aquí a partir de su invitación pendiente.
  async syncFromClerk(clerkId: string): Promise<User> {
    const existing = await this.userRepository.findByClerkId(clerkId);
    if (existing) {
      return existing;
    }

    const email = await this.clerkUserRepository.getPrimaryEmail(clerkId);
    if (!email) {
      throw new ClerkUserError('El usuario no tiene un correo principal.');
    }

    try {
      const userId = await this.createFromInvitation(clerkId, email);
      if (!userId) {
        throw new UserNotRegisteredError(email);
      }
    } catch (error) {
      // El webhook pudo haber creado al usuario al mismo tiempo
      if (!(error instanceof UserAlreadyExistsError)) {
        throw error;
      }
    }

    const user = await this.userRepository.findByClerkId(clerkId);
    if (!user) {
      throw new UserNotCreatedError();
    }
    return user;
  }
}
