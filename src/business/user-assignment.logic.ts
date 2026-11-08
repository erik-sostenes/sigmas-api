import { Injectable } from '@nestjs/common';
import { RoleOption, UserAssignmentOptions } from './user-assignment.model';
import {
  UserAssignmentLogicI,
  UserAssignmentRepositoryI,
} from './user-assignment.ports';

@Injectable()
export class UserAssignmentLogic implements UserAssignmentLogicI {
  constructor(
    private readonly userAssignmentRepository: UserAssignmentRepositoryI,
  ) {}

  async getOptions(): Promise<UserAssignmentOptions> {
    return await this.userAssignmentRepository.findOptions();
  }

  async getRoles(): Promise<RoleOption[]> {
    return await this.userAssignmentRepository.findRoles();
  }
}

