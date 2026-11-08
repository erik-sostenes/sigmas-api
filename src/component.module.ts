import { Module } from '@nestjs/common';
import { MariaDbModule } from './mariadb.module';
import { ComponentController } from './infrastructure/controllers/component.controller';
import { ComponentLogicI, ComponentRepositoryI } from './business/component.ports';
import { ComponentLogic } from './business/component.logic';
import { ComponentMariaDBRepository } from './infrastructure/mariadb/component.mariadb.repository';

@Module({
  imports: [MariaDbModule],
  controllers: [ComponentController],
  providers: [
    {
      provide: ComponentLogicI,
      useClass: ComponentLogic,
    },
    {
      provide: ComponentRepositoryI,
      useClass: ComponentMariaDBRepository,
    },
  ],
  exports: [ComponentLogicI],
})
export class ComponentModule {}

