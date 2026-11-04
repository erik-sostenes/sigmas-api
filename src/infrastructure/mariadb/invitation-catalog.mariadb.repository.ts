import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'mariadb';
import { MARIADB_POOL } from './mariadb.connection';
import {
  InvitationActivityCheckItem,
  InvitationCatalogRepositoryI,
} from '../../business/invitation.ports';

@Injectable()
export class InvitationCatalogMariaDBRepository implements InvitationCatalogRepositoryI {
  constructor(@Inject(MARIADB_POOL) private readonly pool: Pool) {}

  async existsActiveDepartment(departmentId: number): Promise<boolean> {
    const rows = await this.pool.execute<{ id: number }[]>(
      `SELECT id
       FROM departments
       WHERE id = ? AND is_active = TRUE
       LIMIT 1`,
      [departmentId],
    );
    return rows.length > 0;
  }

  async existsUserByEmail(email: string): Promise<boolean> {
    const rows = await this.pool.execute<{ id: string }[]>(
      `SELECT id
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email],
    );
    return rows.length > 0;
  }

  async findExistingRoleCodes(roleCodes: string[]): Promise<string[]> {
    if (roleCodes.length === 0) {
      return [];
    }

    const placeholders = roleCodes.map(() => '?').join(', ');
    const rows = await this.pool.execute<{ code: string }[]>(
      `SELECT code
       FROM roles
       WHERE code IN (${placeholders})`,
      roleCodes,
    );

    return rows.map((row) => row.code);
  }

  async findActivitiesByCodes(
    activityCodes: string[],
  ): Promise<InvitationActivityCheckItem[]> {
    if (activityCodes.length === 0) {
      return [];
    }

    const placeholders = activityCodes.map(() => '?').join(', ');
    const rows = await this.pool.execute<
      { code: string; leader_id: string | null; leader_email: string | null }[]
    >(
      `SELECT
         a.code,
         a.leader_id,
         u.email AS leader_email
       FROM activities a
       LEFT JOIN users u ON u.id = a.leader_id
       WHERE a.code IN (${placeholders})`,
      activityCodes,
    );

    return rows.map((row) => ({
      code: row.code,
      leaderId: row.leader_id ?? null,
      leaderEmail: row.leader_email ?? null,
    }));
  }
}

