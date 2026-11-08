import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'mariadb';
import { MARIADB_POOL } from './mariadb.connection';
import { ComponentRepositoryI } from '../../business/component.ports';
import { ComponentWithAdministrativeUnit } from '../../business/component.model';

type ComponentRow = {
  id: number;
  code: string;
  name: string;
  au_id: number;
  au_code: string;
  au_name: string;
};

@Injectable()
export class ComponentMariaDBRepository implements ComponentRepositoryI {
  constructor(@Inject(MARIADB_POOL) private readonly pool: Pool) {}

  async findAllWithAdministrativeUnit(): Promise<
    ComponentWithAdministrativeUnit[]
  > {
    const rows = await this.pool.execute<ComponentRow[]>(
      `SELECT
         c.id,
         c.code,
         c.name,
         au.id AS au_id,
         au.code AS au_code,
         au.name AS au_name
       FROM components c
       INNER JOIN administrative_units au ON au.id = c.administrative_unit_id
       ORDER BY c.code ASC`,
    );

    return rows.map((row) => ({
      id: Number(row.id),
      code: row.code,
      name: row.name,
      unit_administrative: {
        id: Number(row.au_id),
        code: row.au_code,
        name: row.au_name,
      },
    }));
  }
}

