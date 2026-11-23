import { Injectable } from '@nestjs/common';
import { RoleLogicI, RoleRepositoryI } from './role.ports';
import { Role } from './role.model';

@Injectable()
export class RoleLogic implements RoleLogicI {
  constructor(private readonly roleRepository: RoleRepositoryI) {}

  async getRoles(): Promise<Role[]> {
    return await this.roleRepository.findAll();
  }
}
