import { Module, forwardRef } from '@nestjs/common';
import { MariaDbModule } from './mariadb.module';
import {
  ClerkUserRepositoryI,
  UserLogicI,
  UserRepositoryI,
} from './business/user.ports';
import { UserLogic } from './business/user.logic';
import { UserMariaDBRepository } from './infrastructure/mariadb/user.mariadb.repository';
import { InvitationModule } from './invitation.module'; // <-- IMPORTAR
import { UserWebhookClerkController } from './infrastructure/controllers/user-webhook.controller';
import { UserController } from './infrastructure/controllers/user.controller';
import { ClerkUserRepository } from './infrastructure/clerk/clerk-user.repository';

@Module({
  imports: [MariaDbModule, forwardRef(() => InvitationModule)],
  controllers: [UserWebhookClerkController, UserController],
  providers: [
    { provide: UserLogicI, useClass: UserLogic },
    { provide: UserRepositoryI, useClass: UserMariaDBRepository },
    { provide: ClerkUserRepositoryI, useClass: ClerkUserRepository },
  ],
  exports: [UserLogicI, UserRepositoryI],
})
export class UserModule {}
