import { Module } from '@nestjs/common';
import { InvitationController } from './infrastructure/controllers/invitation.controller';
import { ClerkInvitationRepository } from './infrastructure/clerk/clerk-invitation.repository';
import { InvitationCatalogMariaDBRepository } from './infrastructure/mariadb/invitation-catalog.mariadb.repository';
import {
  InvitationCatalogRepositoryI,
  InvitationLogicI,
  InvitationRepositoryI,
} from './business/invitation.ports';
import { InvitationLogic } from './business/invitation.logic';
import { MariaDbModule } from './mariadb.module';
import { UserModule } from './user.module';

@Module({
  imports: [MariaDbModule, UserModule],
  controllers: [InvitationController],
  providers: [
    {
      provide: InvitationLogicI,
      useClass: InvitationLogic,
    },
    {
      provide: InvitationRepositoryI,
      useClass: ClerkInvitationRepository,
    },
    {
      provide: InvitationCatalogRepositoryI,
      useClass: InvitationCatalogMariaDBRepository,
    },
  ],
})
export class InvitationModule {}
