import { Module, forwardRef } from '@nestjs/common';
import { MariaDbModule } from './mariadb.module';
import { InvitationController } from './infrastructure/controllers/invitation.controller';
import {
  InvitationLogicI,
  InvitationRepositoryI,
  ClerkInvitationRepositoryI,
} from './business/invitation.ports';
import { InvitationLogic } from './business/invitation.logic';
import { InvitationMariaDBRepository } from './infrastructure/mariadb/invitation.mariadb.repository';
import { ClerkInvitationRepository } from './infrastructure/clerk/clerk-invitation.repository';

import { UserModule } from './user.module';
import { DepartmentModule } from './department.module';
import { ComponentModule } from './component.module';
import { RoleModule } from './role.module';
import { ActivityModule } from './activity.module';

@Module({
  imports: [
    MariaDbModule,
    forwardRef(() => UserModule),
    DepartmentModule,
    ComponentModule,
    RoleModule,
    ActivityModule,
  ],
  controllers: [InvitationController],
  providers: [
    { provide: InvitationRepositoryI, useClass: InvitationMariaDBRepository },
    {
      provide: ClerkInvitationRepositoryI,
      useClass: ClerkInvitationRepository,
    },
    { provide: InvitationLogicI, useClass: InvitationLogic },
  ],
  exports: [InvitationLogicI, InvitationRepositoryI],
})
export class InvitationModule {}
