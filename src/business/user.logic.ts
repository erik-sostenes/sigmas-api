import { Injectable } from '@nestjs/common';
import { User, UserId } from './user.model';
import { UserLogicI, UserRepositoryI } from './user.ports';
import { LIDER_ACTIVIDAD_ROLE_CODE } from './user-assignment.model';
import {
  InvalidUserActivitiesRoleError,
  InvalidUserAssignmentError,
  LeaderUserRequiresActivitiesError,
} from './user.errors';

@Injectable()
export class UserLogic implements UserLogicI {
  constructor(private readonly userRepository: UserRepositoryI) {}

  async create(user: User): Promise<UserId> {
    if (!user.clerkId || !user.email) {
      throw new InvalidUserAssignmentError(
        'El identificador de Clerk y el correo electrónico son obligatorios.',
      );
    }

    if (!Number.isInteger(user.departmentId) || user.departmentId < 1) {
      throw new InvalidUserAssignmentError(
        'El ID de departamento debe ser un entero positivo.',
      );
    }

    if (user.roleCodes.length === 0) {
      throw new InvalidUserAssignmentError(
        'El usuario debe tener al menos un rol asignado.',
      );
    }

    const isActivityLeader = user.roleCodes.includes(LIDER_ACTIVIDAD_ROLE_CODE);

    if (!isActivityLeader && user.activityCodes.length > 0) {
      throw new InvalidUserActivitiesRoleError();
    }

    if (isActivityLeader && user.activityCodes.length === 0) {
      throw new LeaderUserRequiresActivitiesError();
    }

    return await this.userRepository.save(user);
  }
}
