import { Controller, Get, UseGuards } from '@nestjs/common';
import { RoleLogicI } from '../../business/role.ports';
import { Role } from '../../business/role.model';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';

@Controller('api/v1/roles')
@UseGuards(ClerkAuthGuard)
export class RoleController {
  constructor(private readonly roleLogic: RoleLogicI) {}

  @Get()
  async findAll(): Promise<Role[]> {
    return await this.roleLogic.getRoles();
  }
}
