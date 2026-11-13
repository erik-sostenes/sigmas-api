import { Injectable } from '@nestjs/common';
import { MariaDBRepository } from './mariadb.repository';
import { UserRepositoryI } from '../../business/user.ports';
import { User, UserId } from '../../business/user.model';
import {
  isDuplicateEntry,
  isForeignKeyViolation,
  foreignKeyColumn,
} from './mariadb.errors';
import {
  UserAlreadyExistsError,
  UserDepartmentNotFoundError,
  UserComponentNotFoundError,
  UserRolesNotFoundError,
  UserActivitiesNotFoundError,
  InvalidUserActivitiesRoleError,
  InvalidUserComponentRoleError, // <-- NUEVO
  ComponentAlreadyHasLeaderError, // <-- NUEVO
  LeaderUserRequiresActivitiesError,
  ActivityAlreadyHasLeaderError,
  UserNotCreatedError,
} from '../../business/user.errors';

@Injectable()
export class UserMariaDBRepository
  extends MariaDBRepository<User>
  implements UserRepositoryI
{
  async save(user: User): Promise<UserId> {
    return this.withTransaction(async (tx) => {
      // 1. Validar Departamento
      const depts = await this.executeOn(
        tx,
        `SELECT id FROM departments WHERE id = ? LIMIT 1`,
        [user.departmentId],
      );
      if (depts.length === 0)
        throw new UserDepartmentNotFoundError(user.departmentId);

      // 2. Validar Componente (si aplica) y buscar si ya tiene líder
      let currentComponentLeaderId: string | null = null;
      if (user.componentId !== null) {
        const comps = await this.executeOn(
          tx,
          `SELECT id FROM components WHERE id = ? LIMIT 1`,
          [user.componentId],
        );
        if (comps.length === 0)
          throw new UserComponentNotFoundError(user.componentId);

        // Bloqueamos el componente para ver si ya tiene un líder
        const compLeader = await this.executeOn(
          tx,
          `SELECT id FROM users WHERE component_id = ? FOR UPDATE`,
          [user.componentId],
        );
        if (compLeader.length > 0) {
          currentComponentLeaderId = compLeader[0].id;
        }
      }

      // 3. Validar Roles
      let roleRows: any[] = [];
      if (user.roleIds.length > 0) {
        const rolePlaceholders = this.placeholders(user.roleIds);
        roleRows = await this.executeOn(
          tx,
          `SELECT id, code, requires_activities, requires_component FROM roles WHERE id IN (${rolePlaceholders})`,
          user.roleIds,
        );
        if (roleRows.length !== user.roleIds.length) {
          const foundIds = new Set(roleRows.map((r) => Number(r.id)));
          const missing = user.roleIds.filter((id) => !foundIds.has(id));
          throw new UserRolesNotFoundError(missing.map(String));
        }
      }

      // 4. Validar Reglas de Negocio (Componente vs Roles)
      const requiresComponent = roleRows.some((r) =>
        Boolean(r.requires_component),
      );
      const hasComponent = user.componentId !== null;

      if (requiresComponent !== hasComponent) {
        throw new InvalidUserComponentRoleError();
      }

      // 5. Validar Reglas de Negocio (Actividades vs Roles)
      const requiresActivities = roleRows.some((r) =>
        Boolean(r.requires_activities),
      );
      const hasActivities = user.activityIds.length > 0;

      if (requiresActivities && !hasActivities)
        throw new LeaderUserRequiresActivitiesError();
      if (!requiresActivities && hasActivities)
        throw new InvalidUserActivitiesRoleError();

      // 6. Validar Actividades y Bloquear Filas (FOR UPDATE)
      let lockedActivities: any[] = [];
      if (hasActivities) {
        const actPlaceholders = this.placeholders(user.activityIds);
        lockedActivities = await this.executeOn(
          tx,
          `SELECT a.id, ua.user_id AS leader_id 
           FROM activities a 
           LEFT JOIN user_activities ua ON ua.activity_id = a.id 
           WHERE a.id IN (${actPlaceholders}) FOR UPDATE`,
          user.activityIds,
        );

        if (lockedActivities.length !== user.activityIds.length) {
          const foundIds = new Set(lockedActivities.map((a) => Number(a.id)));
          const missing = user.activityIds.filter((id) => !foundIds.has(id));
          throw new UserActivitiesNotFoundError(missing.map(String));
        }
      }

      // 7. Insertar / Actualizar Usuario
      const existingUsers = await this.executeOn(
        tx,
        `SELECT id FROM users WHERE clerk_id = ? FOR UPDATE`,
        [user.clerkId],
      );

      let userId: string;

      if (existingUsers.length > 0) {
        userId = existingUsers[0].id;
        await this.executeOn(
          tx,
          `UPDATE users SET department_id=?, component_id=?, title=?, first_name=?, last_name=?, email=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
          [
            user.departmentId,
            user.componentId,
            user.title,
            user.firstName,
            user.lastName,
            user.email,
            userId,
          ],
        );
      } else {
        const insertResult = await this.executeOn(
          tx,
          `INSERT INTO users (clerk_id, department_id, component_id, title, first_name, last_name, email, is_active) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
          [
            user.clerkId,
            user.departmentId,
            user.componentId,
            user.title,
            user.firstName,
            user.lastName,
            user.email,
            user.isActive,
          ],
        );
        userId = insertResult[0]?.id;
        if (!userId) throw new UserNotCreatedError();
      }

      // 8. Validar que el Componente no tenga otro líder
      if (
        currentComponentLeaderId !== null &&
        currentComponentLeaderId !== userId
      ) {
        throw new ComponentAlreadyHasLeaderError(
          user.componentId as number,
          currentComponentLeaderId,
        );
      }

      // 9. Validar que las actividades no tengan otro líder (conflicto)
      const conflicts = lockedActivities.filter(
        (a) => a.leader_id !== null && a.leader_id !== userId,
      );
      if (conflicts.length > 0) {
        throw new ActivityAlreadyHasLeaderError(
          conflicts.map((c) => ({
            activityId: Number(c.id),
            currentLeaderId: c.leader_id,
            currentLeaderEmail: null,
          })),
        );
      }

      // 10. Insertar Roles y Actividades
      for (const role of roleRows) {
        await this.executeOn(
          tx,
          `INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)`,
          [userId, role.id],
        );
      }
      for (const act of lockedActivities) {
        await this.executeOn(
          tx,
          `INSERT INTO user_activities (user_id, activity_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE user_id=VALUES(user_id)`,
          [userId, act.id],
        );
      }

      return userId;
    }).catch((error) => {
      // Manejo de errores SQL al final de la transacción
      if (error instanceof Error && error.name.includes('Error')) throw error;

      if (isDuplicateEntry(error)) throw new UserAlreadyExistsError(user.email);

      if (isForeignKeyViolation(error)) {
        const col = foreignKeyColumn(error);
        if (col === 'department_id')
          throw new UserDepartmentNotFoundError(user.departmentId);
        if (col === 'component_id')
          throw new UserComponentNotFoundError(user.componentId as number);
      }

      throw new UserNotCreatedError();
    });
  }

  async hasActiveRole(clerkId: string, roleCode: string): Promise<boolean> {
    const rows = await this.execute(
      `SELECT 1 FROM users u 
       INNER JOIN user_roles ur ON ur.user_id = u.id 
       INNER JOIN roles r ON r.id = ur.role_id 
       WHERE u.clerk_id = ? AND u.is_active = TRUE AND r.code = ? LIMIT 1`,
      [clerkId, roleCode],
    );
    return rows.length > 0;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const rows = await this.execute(
      `SELECT 1 FROM users WHERE email = ? LIMIT 1`,
      [email],
    );
    return rows.length > 0;
  }

  protected toDomain(row: any): User {
    return User.rehydrate({
      id: row.id,
      clerkId: row.clerk_id,
      departmentId: row.department_id,
      componentId: row.component_id,
      title: row.title,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      isActive: Boolean(row.is_active),
      roleIds: [],
      activityIds: [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
