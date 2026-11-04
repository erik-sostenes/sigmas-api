import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'mariadb';
import { MARIADB_POOL } from './mariadb.connection';
import { UserAssignmentRepositoryI } from '../../business/user-assignment.ports';
import {
  ActivityOption,
  ComponentWithActivitiesOption,
  DepartmentOption,
  LIDER_ACTIVIDAD_ROLE_CODE,
  RoleOption,
  UserAssignmentOptions,
} from '../../business/user-assignment.model';

type DepartmentRow = {
  id: number;
  name: string;
};

type RoleRow = {
  id: number;
  code: string;
  name: string;
};

type ComponentRow = {
  id: number;
  code: string;
  name: string;
};

type ActivityRow = {
  id: number;
  component_id: number;
  code: string;
  name: string;
  leader_id: string | null;
  leader_title: string | null;
  leader_email: string | null;
};

@Injectable()
export class UserAssignmentMariaDBRepository implements UserAssignmentRepositoryI {
  constructor(@Inject(MARIADB_POOL) private readonly pool: Pool) {}

  async findOptions(): Promise<UserAssignmentOptions> {
    const [departmentRows, roleRows, componentRows, activityRows] =
      await Promise.all([
        this.pool.execute<DepartmentRow[]>(
          `SELECT id, name
           FROM departments
           WHERE is_active = TRUE
           ORDER BY name ASC`,
        ),
        this.pool.execute<RoleRow[]>(
          `SELECT id, code, name
           FROM roles
           ORDER BY id ASC`,
        ),
        this.pool.execute<ComponentRow[]>(
          `SELECT id, code, name
           FROM components
           ORDER BY code ASC`,
        ),
        this.pool.execute<ActivityRow[]>(
          `SELECT
             a.id,
             a.component_id,
             a.code,
             a.name,
             u.id AS leader_id,
             u.title AS leader_title,
             u.email AS leader_email
           FROM activities a
           LEFT JOIN users u ON u.id = a.leader_id
           ORDER BY a.code ASC`,
        ),
      ]);

    const departments: DepartmentOption[] = departmentRows.map((row) => ({
      id: Number(row.id),
      name: row.name,
    }));

    const roles: RoleOption[] = roleRows.map((row) => ({
      id: Number(row.id),
      code: row.code,
      name: row.name,
      requiresActivities: row.code === LIDER_ACTIVIDAD_ROLE_CODE,
    }));

    const activitiesByComponentId = new Map<number, ActivityOption[]>();
    for (const row of activityRows) {
      const componentId = Number(row.component_id);
      const list = activitiesByComponentId.get(componentId) ?? [];
      list.push({
        id: Number(row.id),
        code: row.code,
        name: row.name,
        currentLeader:
          row.leader_id && row.leader_email
            ? {
                id: row.leader_id,
                title: row.leader_title ?? null,
                email: row.leader_email,
              }
            : null,
      });
      activitiesByComponentId.set(componentId, list);
    }

    const components: ComponentWithActivitiesOption[] = componentRows.map(
      (row) => {
        const componentId = Number(row.id);
        return {
          id: componentId,
          code: row.code,
          name: row.name,
          activities: activitiesByComponentId.get(componentId) ?? [],
        };
      },
    );

    return {
      departments,
      roles,
      components,
    };
  }
}

