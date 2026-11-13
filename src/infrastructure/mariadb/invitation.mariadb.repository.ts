import { Injectable } from '@nestjs/common';
import { MariaDBRepository } from './mariadb.repository';
import { InvitationRepositoryI } from '../../business/invitation.ports';
import { Invitation } from '../../business/invitation.model';

@Injectable()
export class InvitationMariaDBRepository
  extends MariaDBRepository<Invitation>
  implements InvitationRepositoryI
{
  async save(invitation: Invitation): Promise<string> {
    if (invitation.id) {
      // Update (para guardar el clerk_invitation_id después)
      await this.execute(
        `UPDATE invitations SET clerk_invitation_id = ? WHERE id = ?`,
        [invitation.clerkInvitationId, invitation.id],
      );
      return invitation.id;
    } else {
      const rows = await this.execute(
        `INSERT INTO invitations 
           (email, first_name, last_name, department_id, component_id, title, role_ids, activity_ids) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        [
          invitation.email,
          invitation.firstName,
          invitation.lastName,
          invitation.departmentId,
          invitation.componentId,
          invitation.title,
          JSON.stringify(invitation.roleIds),
          JSON.stringify(invitation.activityIds),
        ],
      );
      return rows[0].id;
    }
  }

  async delete(id: string): Promise<void> {
    await this.execute(`DELETE FROM invitations WHERE id = ?`, [id]);
  }

  async findById(id: string): Promise<Invitation | null> {
    return this.searchOne(`SELECT * FROM invitations WHERE id = ?`, [id]);
  }

  async existsByEmail(email: string): Promise<boolean> {
    const rows = await this.execute(
      `SELECT 1 FROM invitations WHERE email = ? LIMIT 1`,
      [email],
    );
    return rows.length > 0;
  }

  async hasComponentLeader(componentId: number): Promise<boolean> {
    // Revisa si en invitaciones pendientes ya hay alguien con ese componente
    const invRows = await this.execute(
      `SELECT 1 FROM invitations WHERE component_id = ? LIMIT 1`,
      [componentId],
    );
    if (invRows.length > 0) return true;

    // Revisa si en usuarios ya hay alguien con ese componente
    const userRows = await this.execute(
      `SELECT 1 FROM users WHERE component_id = ? LIMIT 1`,
      [componentId],
    );
    return userRows.length > 0;
  }

  async hasActivityLeader(activityIds: number[]): Promise<boolean> {
    if (activityIds.length === 0) return false;

    // 1. Revisar en usuarios
    const placeholders = this.placeholders(activityIds);
    const userRows = await this.execute(
      `SELECT 1 FROM user_activities WHERE activity_id IN (${placeholders}) LIMIT 1`,
      activityIds,
    );
    if (userRows.length > 0) return true;

    // 2. Revisar en invitaciones (usando JSON_CONTAINS)
    for (const id of activityIds) {
      const invRows = await this.execute(
        `SELECT 1 FROM invitations WHERE JSON_CONTAINS(activity_ids, ?) LIMIT 1`,
        [JSON.stringify(id)],
      );
      if (invRows.length > 0) return true;
    }

    return false;
  }
  async findByEmail(email: string): Promise<Invitation | null> {
    return this.searchOne(`SELECT * FROM invitations WHERE email = ? LIMIT 1`, [
      email,
    ]);
  }
  protected toDomain(row: any): Invitation {
    return Invitation.rehydrate({
      id: row.id,
      clerkInvitationId: row.clerk_invitation_id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      departmentId: Number(row.department_id),
      componentId: row.component_id ? Number(row.component_id) : null,
      title: row.title,
      roleIds:
        typeof row.role_ids === 'string'
          ? JSON.parse(row.role_ids)
          : row.role_ids,
      activityIds:
        typeof row.activity_ids === 'string'
          ? JSON.parse(row.activity_ids)
          : row.activity_ids,
      createdAt: row.created_at,
    });
  }
}
