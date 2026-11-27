import { Module } from '@nestjs/common';
import { MariaDbModule } from './mariadb.module';
import { ViewerModule } from './viewer.module';
import { ProviderController } from './infrastructure/controllers/provider.controller';
import { ProviderLogic } from './business/provider.logic';
import { ProviderLogicI, ProviderRepositoryI } from './business/provider.ports';
import { ProviderMariaDBRepository } from './infrastructure/mariadb/provider.mariadb.repository';

@Module({
  imports: [MariaDbModule, ViewerModule],
  controllers: [ProviderController],
  providers: [
    { provide: ProviderLogicI, useClass: ProviderLogic },
    { provide: ProviderRepositoryI, useClass: ProviderMariaDBRepository },
  ],
  exports: [ProviderLogicI, ProviderRepositoryI],
})
export class ProviderModule {}
