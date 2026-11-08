import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'mariadb';
import { MARIADB_POOL } from './mariadb.connection';
import {
  InvitationActivityCheckItem,
  InvitationCatalogRepositoryI,
  RoleLookupItem,
} from '../../business/invitation.ports';

@Injectable()
export class InvitationCatalogMariaDBRepository implements InvitationCatalogRepositoryI {
  constructor(@Inject(MARIADB_POOL) private readonly pool: Pool) {}

  async existsActiveDepartment(departmentId: number): Promise<boolean> {
    const rows = await this.pool.execute<{ id: number }[]>(
      `SELECT id
       FROM departments
       WHERE id = ?
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

  async findRolesByIds(roleIds: number[]): Promise<RoleLookupItem[]> {
    if (roleIds.length === 0) {
      return [];
    }

    const placeholders = roleIds.map(() => '?').join(', ');
    const rows = await this.pool.execute<{ id: number; code: string }[]>(
      `SELECT id, code
       FROM roles
       WHERE id IN (${placeholders})`,
      roleIds,
    );

    return rows.map((row) => ({
      id: Number(row.id),
      code: row.code,
    }));
  }

  async findRolesByCodes(roleCodes: string[]): Promise<RoleLookupItem[]> {
    if (roleCodes.length === 0) {
      return [];
    }

    const placeholders = roleCodes.map(() => '?').join(', ');
    const rows = await this.pool.execute<{ id: number; code: string }[]>(
      `SELECT id, code
       FROM roles
       WHERE code IN (${placeholders})`,
      roleCodes,
    );

    return rows.map((row) => ({
      id: Number(row.id),
      code: row.code,
    }));
  }

  async findActivitiesByCodes(
    activityCodes: string[],
  ): Promise<InvitationActivityCheckItem[]> {
    if (activityCodes.length === 0) {
      return [];
    }

    const placeholders = activityCodes.map(() => '?').join(', ');
    const rows = await this.pool.execute<
      {
        id: number;
        code: string;
        leader_id: string | null;
        leader_email: string | null;
      }[]
    >(
      `SELECT
         a.id,
         a.code,
         ua.user_id AS leader_id,
         u.email AS leader_email
       FROM activities a
       LEFT JOIN user_activities ua ON ua.activity_id = a.id
       LEFT JOIN users u ON u.id = ua.user_id
       WHERE a.code IN (${placeholders})`,
      activityCodes,
    );

    return rows.map((row) => ({
      id: Number(row.id),
      code: row.code,
      leaderId: row.leader_id ?? null,
      leaderEmail: row.leader_email ?? null,
    }));
  }

  async findActivitiesByIds(
    activityIds: number[],
  ): Promise<InvitationActivityCheckItem[]> {
    if (activityIds.length === 0) {
      return [];
    }

    const placeholders = activityIds.map(() => '?').join(', ');
    const rows = await this.pool.execute<
      {
        id: number;
        code: string;
        leader_id: string | null;
        leader_email: string | null;
      }[]
    >(
      `SELECT
         a.id,
         a.code,
         ua.user_id AS leader_id,
         u.email AS leader_email
       FROM activities a
       LEFT JOIN user_activities ua ON ua.activity_id = a.id
       LEFT JOIN users u ON u.id = ua.user_id
       WHERE a.id IN (${placeholders})`,
      activityIds,
    );

    return rows.map((row) => ({
      id: Number(row.id),
      code: row.code,
      leaderId: row.leader_id ?? null,
      leaderEmail: row.leader_email ?? null,
    }));
  }
}

