import { Injectable } from '@nestjs/common';
import { Department } from '../../business/department.model';
import type { DepartmentRepositoryI } from '../../business/department.ports';
import { MariaDBRepository, type Row } from './mariadb.repository';

type DatabaseDepartmentRow = {
  id: number;
  name: string;
};

@Injectable()
export class DepartmentRepository
  extends MariaDBRepository<Department>
  implements DepartmentRepositoryI
{
  async findAll(): Promise<Department[]> {
    return await this.searchMany(
      `SELECT id, name FROM departments ORDER BY name ASC`,
    );
  }

  async exists(id: number): Promise<boolean> {
    const rows = await this.execute(
      `SELECT 1 FROM departments WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows.length > 0;
  }

  protected toDomain(row: DatabaseDepartmentRow): Department {
    return Department.rehydrate({
      id: Number(row.id),
      name: row.name,
    });
  }
}
