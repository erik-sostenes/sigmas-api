import { User, UserId } from './user.model';

// Left port
export abstract class UserLogicI {
  abstract create(user: User): Promise<UserId>;
}

// Right port
export abstract class UserRepositoryI {
  abstract save(user: User): Promise<UserId>;
}
