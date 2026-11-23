import { Module } from '@nestjs/common';
import { MariaDbModule } from './mariadb.module';
import { RoleController } from './infrastructure/controllers/role.controller';
import { RoleLogicI, RoleRepositoryI } from './business/role.ports';
import { RoleRepository } from './infrastructure/mariadb/role.mariadb.repository';
import { RoleLogic } from './business/role.logic';

@Module({
  imports: [MariaDbModule],
  controllers: [RoleController],
  providers: [
    {
      provide: RoleLogicI,
      useClass: RoleLogic,
    },
    {
      provide: RoleRepositoryI,
      useClass: RoleRepository,
    },
  ],
  exports: [RoleLogicI, RoleRepositoryI],
})
export class RoleModule {}
