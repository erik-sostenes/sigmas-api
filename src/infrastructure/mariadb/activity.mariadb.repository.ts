import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'mariadb';
import { MARIADB_POOL } from './mariadb.connection';
import { ActivityRepositoryI } from '../../business/activity.ports';
import { ActivityItem } from '../../business/activity.model';

type ActivityRow = {
  id: number;
  code: string;
  name: string;
  component_id: number;
  comp_code: string;
  comp_name: string;
};

@Injectable()
export class ActivityMariaDBRepository implements ActivityRepositoryI {
  constructor(@Inject(MARIADB_POOL) private readonly pool: Pool) {}

  async findAll(componentId?: number): Promise<ActivityItem[]> {
    const hasFilter = componentId !== undefined && !Number.isNaN(componentId);

    const query = `
      SELECT
        a.id,
        a.code,
        a.name,
        c.id AS component_id,
        c.code AS comp_code,
        c.name AS comp_name
      FROM activities a
      INNER JOIN components c ON c.id = a.component_id
      ${hasFilter ? 'WHERE a.component_id = ?' : ''}
      ORDER BY c.code ASC, a.code ASC
    `;

    const rows = hasFilter
      ? await this.pool.execute<ActivityRow[]>(query, [componentId])
      : await this.pool.execute<ActivityRow[]>(query);

    return rows.map((row) => ({
      id: Number(row.id),
      code: row.code,
      name: row.name,
      component: {
        id: Number(row.component_id),
        code: row.comp_code,
        name: row.comp_name,
      },
    }));
  }

  async findByComponentId(componentId: number): Promise<ActivityItem[]> {
    return await this.findAll(componentId);
  }
}

