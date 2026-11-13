import { Injectable } from '@nestjs/common';
import { ActivityItem } from '../../business/activity.model';
import type { ActivityRepositoryI } from '../../business/activity.ports';
import { MariaDBRepository, type Row } from './mariadb.repository';

type DatabaseActivityRow = {
  id: number;
  component_id: number;
  code: string;
  name: string;
};

@Injectable()
export class ActivityRepository
  extends MariaDBRepository<ActivityItem>
  implements ActivityRepositoryI
{
  async findAll(): Promise<ActivityItem[]> {
    return await this.searchMany(
      `SELECT id, component_id, code, name
         FROM activities
        ORDER BY code ASC`,
    );
  }

  async findByIds(ids: number[]): Promise<ActivityItem[]> {
    if (ids.length === 0) return [];
    const placeholders = this.placeholders(ids);
    return await this.searchMany(
      `SELECT id, component_id, code, name 
     FROM activities 
     WHERE id IN (${placeholders})`,
      ids,
    );
  }

  async findByComponentId(componentId: number): Promise<ActivityItem[]> {
    return await this.searchMany(
      `SELECT id, component_id, code, name
         FROM activities
        WHERE component_id = ?
        ORDER BY code ASC`,
      [componentId],
    );
  }

  protected toDomain(row: DatabaseActivityRow): ActivityItem {
    return ActivityItem.rehydrate({
      id: Number(row.id),
      componentId: Number(row.component_id),
      code: row.code,
      name: row.name,
    });
  }
}
