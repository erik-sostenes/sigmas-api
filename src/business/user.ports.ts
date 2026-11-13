import { User, UserId } from './user.model';

// Left port
export abstract class UserLogicI {
  abstract createFromInvitation(
    clerkId: string,
    email: string,
  ): Promise<UserId | null>;
}

// Right port
export abstract class UserRepositoryI {
  abstract save(user: User): Promise<UserId>;
  abstract hasActiveRole(clerkId: string, roleCode: string): Promise<boolean>;
  abstract existsByEmail(email: string): Promise<boolean>;
}
