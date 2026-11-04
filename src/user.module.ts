import { Module } from '@nestjs/common';
import { UserWebhookClerkController } from './infrastructure/controllers/user-webhook.controller';
import { UserLogicI, UserRepositoryI } from './business/user.ports';
import { UserLogic } from './business/user.logic';
import { UserMariaDBRepository } from './infrastructure/mariadb/user.mariadb.repository';
import { MariaDbModule } from './mariadb.module';
import { SuperAdminGuard } from './infrastructure/controllers/guards/super-admin.guard';
import { ClerkAuthGuard } from './infrastructure/controllers/guards/clerk-auth.guard';

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
    ClerkAuthGuard,
    SuperAdminGuard,
  ],
  exports: [UserRepositoryI, ClerkAuthGuard, SuperAdminGuard],
})
export class UserModule {}
