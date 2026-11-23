import { Injectable } from '@nestjs/common';
import { Department } from './department.model';
import { DepartmentLogicI, DepartmentRepositoryI } from './department.ports';

@Injectable()
export class DepartmentLogic implements DepartmentLogicI {
  constructor(private readonly departmentRepository: DepartmentRepositoryI) {}

  async getDepartments(): Promise<Department[]> {
    return await this.departmentRepository.findAll();
  }
}
