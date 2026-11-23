import { Role } from './role.model';

export abstract class RoleLogicI {
  abstract getRoles(): Promise<Role[]>;
}

export abstract class RoleRepositoryI {
  abstract findAll(): Promise<Role[]>;
  abstract findByIds(ids: number[]): Promise<Role[]>;
}
