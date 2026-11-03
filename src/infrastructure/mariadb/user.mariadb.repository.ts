import { Injectable } from '@nestjs/common';
import { MariaDBRepository, Row } from './mariadb.repository';
import { UserRepositoryI } from '../../business/user.ports';
import { User, UserId } from '../../business/user.model';
import { isDuplicateEntry, isForeignKeyViolation } from './mariadb.errors';
import {
  UserAlreadyExistsError,
  UserDepartmentNotFoundError,
  UserNotCreatedError,
} from '../../business/user.errors';

type DatabaseUserRow = {
  id: string;
  clerk_id: string;
  department_id: number;
  title: string | null;
  email: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

@Injectable()
export class UserMariaDBRepository
  extends MariaDBRepository<User>
  implements UserRepositoryI
{
  async save(user: User): Promise<UserId> {
    let rows: Row[];

    // TODO: agregar los roles
    // TODO: revisar, creo va ser necesario manejar una transaccion
    try {
      rows = await this.execute(
        `INSERT INTO users
         (clerk_id, department_id, title, email, is_active)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         department_id = VALUES(department_id),
         title = VALUES(title),
         is_active = VALUES(is_active),
         updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
        [
          user.clerkId,
          user.departmentId,
          user.title,
          user.email,
          user.isActive,
        ],
      );
    } catch (error) {
      if (isDuplicateEntry(error)) {
        throw new UserAlreadyExistsError(user.email);
      }

      if (isForeignKeyViolation(error)) {
        throw new UserDepartmentNotFoundError(user.departmentId);
      }

      throw new UserNotCreatedError();
    }

    const id = rows[0]?.id;

    if (!id) {
      throw new UserNotCreatedError();
    }

    return id as UserId;
  }

  protected toDomain(row: DatabaseUserRow): User {
    return new User({
      id: row.id,
      clerkId: row.clerk_id,
      departmentId: row.department_id,
      title: row.title,
      email: row.email,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
