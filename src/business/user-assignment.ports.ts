import { UserAssignmentOptions } from './user-assignment.model';

// Left port
export abstract class UserAssignmentLogicI {
  abstract getOptions(): Promise<UserAssignmentOptions>;
}

// Right port
export abstract class UserAssignmentRepositoryI {
  abstract findOptions(): Promise<UserAssignmentOptions>;
}

