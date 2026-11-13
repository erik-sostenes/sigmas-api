import { Department } from './department.model';

export abstract class DepartmentLogicI {
  abstract getDepartments(): Promise<Department[]>;
}

export abstract class DepartmentRepositoryI {
  abstract findAll(): Promise<Department[]>;
  abstract exists(id: number): Promise<boolean>;
}
