import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'mariadb';
import { MARIADB_POOL } from './mariadb.connection';
import type { Viewer } from '../../business/viewer.model';
import type { RoleCode } from '../../business/role-codes';
import { ViewerRepositoryI } from '../../business/viewer.ports';

type ViewerRow = {
  user_id: string;
  role_codes: unknown;
};

@Injectable()
export class ViewerMariaDBRepository implements ViewerRepositoryI {
  constructor(@Inject(MARIADB_POOL) private readonly pool: Pool) {}

  async findActiveByClerkId(clerkId: string): Promise<Viewer | null> {
    const rows = await this.pool.execute<ViewerRow[]>(
      `SELECT u.id AS user_id,
         (SELECT JSON_ARRAYAGG(r.code)
          FROM user_roles ur
          INNER JOIN roles r ON r.id = ur.role_id
          WHERE ur.user_id = u.id) AS role_codes
       FROM users u
       WHERE u.clerk_id = ? AND u.is_active = TRUE
       LIMIT 1`,
      [clerkId],
    );

    const row = rows[0];
    if (!row) return null;

    return {
      userId: String(row.user_id),
      roleCodes: this.parseRoleCodes(row.role_codes),
    };
  }

  // JSON_ARRAYAGG llega como string en MariaDB y como NULL si no hay roles
  private parseRoleCodes(value: unknown): RoleCode[] {
    if (value === null || value === undefined) return [];
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? (parsed.map(String) as RoleCode[]) : [];
  }
}
