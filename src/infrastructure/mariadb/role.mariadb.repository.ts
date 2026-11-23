import { Injectable } from '@nestjs/common';
import { MariaDBRepository } from './mariadb.repository';
import { RoleRepositoryI } from '../../business/role.ports';
import { Role } from '../../business/role.model';

type DatabaseRoleRow = {
  id: number;
  code: string;
  name: string;
  requires_activities: number | boolean;
  requires_component: number | boolean;
};

@Injectable()
export class RoleRepository
  extends MariaDBRepository<Role>
  implements RoleRepositoryI
{
  async findAll(): Promise<Role[]> {
    return await this.searchMany(
      `SELECT id, code, name, requires_activities, requires_component 
       FROM roles ORDER BY name ASC`,
    );
  }

  async findByIds(ids: number[]): Promise<Role[]> {
    if (ids.length === 0) return [];
    const placeholders = this.placeholders(ids);
    return await this.searchMany(
      `SELECT id, code, name, requires_activities, requires_component 
       FROM roles 
       WHERE id IN (${placeholders})`,
      ids,
    );
  }

  protected toDomain(row: DatabaseRoleRow): Role {
    return Role.rehydrate({
      id: Number(row.id),
      code: row.code,
      name: row.name,
      // FORZAMOS EL BOOLEANO AQUÍ
      requiresActivities: Boolean(row.requires_activities),
      requiresComponent: Boolean(row.requires_component), // <-- REVISAR
    });
  }
}
