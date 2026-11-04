import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { UserAssignmentLogicI } from '../../business/user-assignment.ports';
import { UserAssignmentOptions } from '../../business/user-assignment.model';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';

@Controller('api/v1/admin/user-assignment-options')
@UseGuards(ClerkAuthGuard, SuperAdminGuard)
export class AdminUserAssignmentController {
  constructor(private readonly userAssignmentLogic: UserAssignmentLogicI) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getOptions(): Promise<UserAssignmentOptions> {
    return await this.userAssignmentLogic.getOptions();
  }
}

