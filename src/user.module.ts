import { Module, forwardRef } from '@nestjs/common';
import { MariaDbModule } from './mariadb.module';
import { UserLogicI, UserRepositoryI } from './business/user.ports';
import { UserLogic } from './business/user.logic';
import { UserMariaDBRepository } from './infrastructure/mariadb/user.mariadb.repository';
import { InvitationModule } from './invitation.module'; // <-- IMPORTAR
import { UserWebhookClerkController } from './infrastructure/controllers/user-webhook.controller';

@Module({
  imports: [MariaDbModule, forwardRef(() => InvitationModule)],
  controllers: [UserWebhookClerkController],
  providers: [
    { provide: UserLogicI, useClass: UserLogic },
    { provide: UserRepositoryI, useClass: UserMariaDBRepository },
  ],
  exports: [UserLogicI, UserRepositoryI],
})
export class UserModule {}
