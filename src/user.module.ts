import { Module } from '@nestjs/common';
import { UserWebhookClerkController } from './infrastructure/controllers/user-webhook.controller';
import { UserLogicI, UserRepositoryI } from './business/user.ports';
import { UserLogic } from './business/user.logic';
import { UserMariaDBRepository } from './infrastructure/mariadb/user.mariadb.repository';
import { MariaDbModule } from './mariadb.module';

@Module({
  imports: [MariaDbModule],
  controllers: [UserWebhookClerkController],
  providers: [
    {
      provide: UserLogicI,
      useClass: UserLogic,
    },
    {
      provide: UserRepositoryI,
      useClass: UserMariaDBRepository,
    },
  ],
})
export class UserModule {}
