import { Injectable } from '@nestjs/common';
import { Component } from '../../business/component.model';
import { AdministrativeUnit } from '../../business/administrative-unit.model';
import type {
  ComponentFilters,
  ComponentRepositoryI,
} from '../../business/component.ports';
import { MariaDBRepository, type Row } from './mariadb.repository';

type DatabaseComponentWithAdministrativeUnitRow = {
  c_id: number;
  c_code: string;
  c_name: string;
  au_id: number;
  au_code: string;
  au_name: string;
};

@Injectable()
export class ComponentRepository
  extends MariaDBRepository<Component>
  implements ComponentRepositoryI
{
  async findAll(filters?: ComponentFilters): Promise<Component[]> {
    return this.findAllWithAdministrativeUnit(filters);
  }

  async findAllWithAdministrativeUnit(
    filters?: ComponentFilters,
  ): Promise<Component[]> {
    // Basado en las actividades del componente, con la misma condición de líder activo
    // que usa la creación de solicitudes.
    const leaderCondition = filters?.withActiveLeader
      ? `WHERE EXISTS (
           SELECT 1
           FROM activities a
           INNER JOIN user_activities ua ON ua.activity_id = a.id
           INNER JOIN users u ON u.id = ua.user_id AND u.is_active = TRUE
           WHERE a.component_id = c.id
         )`
      : '';

    return this.searchMany(
      `SELECT
         c.id      AS c_id,
         c.code    AS c_code,
         c.name    AS c_name,
         au.id     AS au_id,
         au.code   AS au_code,
         au.name   AS au_name
       FROM components c
       INNER JOIN administrative_units au
         ON au.id = c.administrative_unit_id
       ${leaderCondition}
       ORDER BY c.code ASC`,
    );
  }

  async exists(id: number): Promise<boolean> {
    const rows = await this.execute(
      `SELECT 1 FROM components WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows.length > 0;
  }

  protected toDomain(
    row: DatabaseComponentWithAdministrativeUnitRow,
  ): Component {
    return Component.rehydrate({
      id: Number(row.c_id),
      code: row.c_code,
      name: row.c_name,
      administrativeUnit: AdministrativeUnit.rehydrate({
        id: Number(row.au_id),
        code: row.au_code,
        name: row.au_name,
      }),
    });
  }
}
