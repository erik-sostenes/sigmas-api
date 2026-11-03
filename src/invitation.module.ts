import { Module } from '@nestjs/common';
import { InvitationController } from './infrastructure/controllers/invitation.controller';
import { ClerkInvitationRepository } from './infrastructure/clerk/clerk-invitation.repository';
import {
  InvitationLogicI,
  InvitationRepositoryI,
} from './business/invitation.ports';
import { InvitationLogic } from './business/invitation.logic';

@Module({
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
  ],
})
export class InvitationModule {}
