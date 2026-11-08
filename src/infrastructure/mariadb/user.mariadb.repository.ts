import { Injectable } from '@nestjs/common';
import { MariaDBRepository } from './mariadb.repository';
import { UserRepositoryI } from '../../business/user.ports';
import { User, UserId } from '../../business/user.model';
import { isDuplicateEntry, isForeignKeyViolation } from './mariadb.errors';
import {
  ActivityAlreadyHasLeaderError,
  InvalidUserActivitiesRoleError,
  LeaderUserRequiresActivitiesError,
  UserActivitiesNotFoundError,
  UserAlreadyExistsError,
  UserDepartmentNotFoundError,
  UserEmailConflictError,
  UserNotCreatedError,
  UserRolesNotFoundError,
} from '../../business/user.errors';
import { LIDER_ACTIVIDAD_ROLE_CODE } from '../../business/user-assignment.model';

type DatabaseUserRow = {
  id: string;
  clerk_id: string;
  department_id: number;
  title: string | null;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

type LockedActivityRow = {
  id: number;
  code: string;
  leader_id: string | null;
  leader_email: string | null;
};

@Injectable()
export class UserMariaDBRepository
  extends MariaDBRepository<User>
  implements UserRepositoryI
{
  async save(user: User): Promise<UserId> {
    const conn = await this.pool.getConnection();

    try {
      await conn.beginTransaction();

      const departmentRows = await conn.execute<{ id: number }[]>(
        `SELECT id
         FROM departments
         WHERE id = ?
         LIMIT 1`,
        [user.departmentId],
      );

      if (departmentRows.length === 0) {
        throw new UserDepartmentNotFoundError(user.departmentId);
      }

      let roleRows: { id: number; code: string }[] = [];
      if (user.roleCodes.length > 0) {
        const rolePlaceholders = this.placeholders(user.roleCodes);
        roleRows = await conn.execute<{ id: number; code: string }[]>(
          `SELECT id, code
           FROM roles
           WHERE code IN (${rolePlaceholders})`,
          user.roleCodes,
        );

        const roleIdByCode = new Map<string, number>();
        for (const row of roleRows) {
          roleIdByCode.set(row.code, Number(row.id));
        }

        const missingRoleCodes = user.roleCodes.filter(
          (code) => !roleIdByCode.has(code),
        );
        if (missingRoleCodes.length > 0) {
          throw new UserRolesNotFoundError(missingRoleCodes);
        }
      } else if (user.roleIds.length > 0) {
        const rolePlaceholders = this.placeholders(user.roleIds);
        roleRows = await conn.execute<{ id: number; code: string }[]>(
          `SELECT id, code
           FROM roles
           WHERE id IN (${rolePlaceholders})`,
          user.roleIds,
        );

        const foundIdSet = new Set(roleRows.map((r) => Number(r.id)));
        const missingRoleIds = user.roleIds.filter(
          (id) => !foundIdSet.has(id),
        );
        if (missingRoleIds.length > 0) {
          throw new UserRolesNotFoundError(missingRoleIds.map(String));
        }
      }

      const resolvedRoleCodes = roleRows.map((r) => r.code);
      const isActivityLeader = resolvedRoleCodes.includes(
        LIDER_ACTIVIDAD_ROLE_CODE,
      );
      const hasActivities =
        user.activityIds.length > 0 || user.activityCodes.length > 0;

      if (!isActivityLeader && hasActivities) {
        throw new InvalidUserActivitiesRoleError();
      }

      if (isActivityLeader && !hasActivities) {
        throw new LeaderUserRequiresActivitiesError();
      }

      let lockedActivities: LockedActivityRow[] = [];
      if (user.activityIds.length > 0) {
        const activityPlaceholders = this.placeholders(user.activityIds);
        lockedActivities = await conn.execute<LockedActivityRow[]>(
          `SELECT
             a.id,
             a.code,
             ua.user_id AS leader_id,
             u.email AS leader_email
           FROM activities a
           LEFT JOIN user_activities ua ON ua.activity_id = a.id
           LEFT JOIN users u ON u.id = ua.user_id
           WHERE a.id IN (${activityPlaceholders})
           FOR UPDATE`,
          user.activityIds,
        );

        const foundActivityIds = new Set(
          lockedActivities.map((row) => Number(row.id)),
        );
        const missingActivityIds = user.activityIds.filter(
          (id) => !foundActivityIds.has(id),
        );
        if (missingActivityIds.length > 0) {
          throw new UserActivitiesNotFoundError(missingActivityIds.map(String));
        }
      } else if (user.activityCodes.length > 0) {
        const activityPlaceholders = this.placeholders(user.activityCodes);
        lockedActivities = await conn.execute<LockedActivityRow[]>(
          `SELECT
             a.id,
             a.code,
             ua.user_id AS leader_id,
             u.email AS leader_email
           FROM activities a
           LEFT JOIN user_activities ua ON ua.activity_id = a.id
           LEFT JOIN users u ON u.id = ua.user_id
           WHERE a.code IN (${activityPlaceholders})
           FOR UPDATE`,
          user.activityCodes,
        );

        const foundActivityCodes = new Set(
          lockedActivities.map((row) => row.code),
        );
        const missingActivityCodes = user.activityCodes.filter(
          (code) => !foundActivityCodes.has(code),
        );
        if (missingActivityCodes.length > 0) {
          throw new UserActivitiesNotFoundError(missingActivityCodes);
        }
      }

      const existingUsers = await conn.execute<
        { id: string; clerk_id: string; email: string }[]
      >(
        `SELECT id, clerk_id, email
         FROM users
         WHERE clerk_id = ? OR email = ?
         FOR UPDATE`,
        [user.clerkId, user.email],
      );

      const conflictingEmailUser = existingUsers.find(
        (row) =>
          row.email.toLowerCase() === user.email.toLowerCase() &&
          row.clerk_id !== user.clerkId,
      );
      if (conflictingEmailUser) {
        throw new UserEmailConflictError(user.email);
      }

      const existingByClerkId = existingUsers.find(
        (row) => row.clerk_id === user.clerkId,
      );

      let userId: string | undefined;

      if (existingByClerkId) {
        userId = existingByClerkId.id;
        await conn.execute(
          `UPDATE users
           SET department_id = ?,
               title = ?,
               first_name = ?,
               last_name = ?,
               email = ?,
               is_active = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            user.departmentId,
            user.title,
            user.firstName,
            user.lastName,
            user.email,
            user.isActive,
            userId,
          ],
        );
      } else {
        const insertedRows = await conn.execute<{ id: string }[]>(
          `INSERT INTO users
             (clerk_id, department_id, title, first_name, last_name, email, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           RETURNING id`,
          [
            user.clerkId,
            user.departmentId,
            user.title,
            user.firstName,
            user.lastName,
            user.email,
            user.isActive,
          ],
        );
        userId = insertedRows[0]?.id;
      }

      if (!userId) {
        throw new UserNotCreatedError();
      }

      if (lockedActivities.length > 0) {
        const conflicts = lockedActivities
          .filter((row) => row.leader_id !== null && row.leader_id !== userId)
          .map((row) => ({
            activityCode: row.code,
            currentLeaderId: row.leader_id as string,
            currentLeaderEmail: row.leader_email ?? null,
          }));

        if (conflicts.length > 0) {
          throw new ActivityAlreadyHasLeaderError(conflicts);
        }
      }

      for (const roleRow of roleRows) {
        await conn.execute(
          `INSERT IGNORE INTO user_roles (user_id, role_id)
           VALUES (?, ?)`,
          [userId, roleRow.id],
        );
      }

      for (const activity of lockedActivities) {
        await conn.execute(
          `INSERT INTO user_activities (user_id, activity_id)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)`,
          [userId, activity.id],
        );
      }

      await conn.commit();

      return userId as UserId;
    } catch (error) {
      await conn.rollback();

      if (
        error instanceof UserDepartmentNotFoundError ||
        error instanceof UserRolesNotFoundError ||
        error instanceof UserActivitiesNotFoundError ||
        error instanceof UserEmailConflictError ||
        error instanceof ActivityAlreadyHasLeaderError ||
        error instanceof InvalidUserActivitiesRoleError ||
        error instanceof LeaderUserRequiresActivitiesError ||
        error instanceof UserNotCreatedError
      ) {
        throw error;
      }

      if (isDuplicateEntry(error)) {
        throw new UserAlreadyExistsError(user.email);
      }

      if (isForeignKeyViolation(error)) {
        throw new UserDepartmentNotFoundError(user.departmentId);
      }

      throw new UserNotCreatedError();
    } finally {
      await conn.release();
    }
  }

  async hasActiveRole(clerkId: string, roleCode: string): Promise<boolean> {
    const rows = await this.execute(
      `SELECT 1 AS has_role
       FROM users u
       INNER JOIN user_roles ur ON ur.user_id = u.id
       INNER JOIN roles r ON r.id = ur.role_id
       WHERE u.clerk_id = ?
         AND u.is_active = TRUE
         AND r.code = ?
       LIMIT 1`,
      [clerkId, roleCode],
    );

    return rows.length > 0;
  }

  protected toDomain(row: DatabaseUserRow): User {
    return new User({
      id: row.id,
      clerkId: row.clerk_id,
      departmentId: row.department_id,
      title: row.title,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
