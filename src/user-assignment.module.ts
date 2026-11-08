import { Module } from '@nestjs/common';
import { MariaDbModule } from './mariadb.module';
import { UserModule } from './user.module';
import { AdminUserAssignmentController } from './infrastructure/controllers/admin-user-assignment.controller';
import { RoleController } from './infrastructure/controllers/role.controller';
import {
  UserAssignmentLogicI,
  UserAssignmentRepositoryI,
} from './business/user-assignment.ports';
import { UserAssignmentLogic } from './business/user-assignment.logic';
import { UserAssignmentMariaDBRepository } from './infrastructure/mariadb/user-assignment.mariadb.repository';

@Module({
  imports: [MariaDbModule, UserModule],
  controllers: [AdminUserAssignmentController, RoleController],
  providers: [
    {
      provide: UserAssignmentLogicI,
      useClass: UserAssignmentLogic,
    },
    {
      provide: UserAssignmentRepositoryI,
      useClass: UserAssignmentMariaDBRepository,
    },
  ],
})
export class UserAssignmentModule {}

