import { RoleOption, UserAssignmentOptions } from './user-assignment.model';

// Left port
export abstract class UserAssignmentLogicI {
  abstract getOptions(): Promise<UserAssignmentOptions>;
  abstract getRoles(): Promise<RoleOption[]>;
}

// Right port
export abstract class UserAssignmentRepositoryI {
  abstract findOptions(): Promise<UserAssignmentOptions>;
  abstract findRoles(): Promise<RoleOption[]>;
}

