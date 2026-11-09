import { Module } from '@nestjs/common';
import { MariaDbModule } from './mariadb.module';
import { ActivityController } from './infrastructure/controllers/activity.controller';
import { ActivityLogicI, ActivityRepositoryI } from './business/activity.ports';
import { ActivityLogic } from './business/activity.logic';
import { ActivityMariaDBRepository } from './infrastructure/mariadb/activity.mariadb.repository';

@Module({
  imports: [MariaDbModule],
  controllers: [ActivityController],
  providers: [
    {
      provide: ActivityLogicI,
      useClass: ActivityLogic,
    },
    {
      provide: ActivityRepositoryI,
      useClass: ActivityMariaDBRepository,
    },
  ],
  exports: [ActivityLogicI],
})
export class ActivityModule {}

