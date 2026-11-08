import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { UserAssignmentLogicI } from '../../business/user-assignment.ports';
import { RoleOption } from '../../business/user-assignment.model';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';

@Controller('api/v1/roles')
@UseGuards(ClerkAuthGuard)
export class RoleController {
  constructor(private readonly userAssignmentLogic: UserAssignmentLogicI) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getRoles(): Promise<RoleOption[]> {
    return await this.userAssignmentLogic.getRoles();
  }
}

