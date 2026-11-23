import { Injectable } from '@nestjs/common';
import { ActivityItem } from '../../business/activity.model';
import type {
  ActivityFilters,
  ActivityRepositoryI,
} from '../../business/activity.ports';
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
  async findAll(filters?: ActivityFilters): Promise<ActivityItem[]> {
    return await this.searchMany(
      `SELECT a.id, a.component_id, a.code, a.name
         FROM activities a
        WHERE 1 = 1 ${this.leaderCondition(filters)}
        ORDER BY a.code ASC`,
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

  async findByComponentId(
    componentId: number,
    filters?: ActivityFilters,
  ): Promise<ActivityItem[]> {
    return await this.searchMany(
      `SELECT a.id, a.component_id, a.code, a.name
         FROM activities a
        WHERE a.component_id = ? ${this.leaderCondition(filters)}
        ORDER BY a.code ASC`,
      [componentId],
    );
  }

  // Misma condición que usa la creación de solicitudes para fijar el líder de cada fila.
  private leaderCondition(filters?: ActivityFilters): string {
    if (!filters?.withActiveLeader) return '';
    return `AND EXISTS (
      SELECT 1
      FROM user_activities ua
      INNER JOIN users u ON u.id = ua.user_id AND u.is_active = TRUE
      WHERE ua.activity_id = a.id
    )`;
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
