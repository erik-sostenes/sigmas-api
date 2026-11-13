import { Controller, Get, UseGuards } from '@nestjs/common';
import { Department } from '../../business/department.model';
import { DepartmentLogicI } from '../../business/department.ports';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';

@Controller('api/v1/departments')
@UseGuards(ClerkAuthGuard)
export class DepartmentController {
  constructor(private readonly departmentLogic: DepartmentLogicI) {}

  @Get()
  async findAll(): Promise<Department[]> {
    return await this.departmentLogic.getDepartments();
  }
}
