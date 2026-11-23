import { User, UserId } from './user.model';

// Left port
export abstract class UserLogicI {
  abstract createFromInvitation(
    clerkId: string,
    email: string,
  ): Promise<UserId | null>;
  abstract getUsers(): Promise<User[]>;
  abstract syncFromClerk(clerkId: string): Promise<User>;
}

// Right port
export abstract class UserRepositoryI {
  abstract save(user: User): Promise<UserId>;
  abstract hasActiveRole(clerkId: string, roleCode: string): Promise<boolean>;
  abstract existsByEmail(email: string): Promise<boolean>;
  abstract findAll(): Promise<User[]>;
  abstract findByClerkId(clerkId: string): Promise<User | null>;
}

// Clerk
export abstract class ClerkUserRepositoryI {
  abstract getPrimaryEmail(clerkId: string): Promise<string | null>;
}
