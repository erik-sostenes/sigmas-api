import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { UserAssignmentLogicI } from '../../business/user-assignment.ports';
import { DepartmentOption } from '../../business/user-assignment.model';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';

@Controller('api/v1/departments')
@UseGuards(ClerkAuthGuard)
export class DepartmentController {
  constructor(private readonly userAssignmentLogic: UserAssignmentLogicI) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getDepartments(): Promise<DepartmentOption[]> {
    return await this.userAssignmentLogic.getDepartments();
  }
}

