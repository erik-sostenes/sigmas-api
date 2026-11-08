import { Module } from '@nestjs/common';
import { MariaDbModule } from './mariadb.module';
import { IsoController } from './infrastructure/controllers/iso.controller';
import { IsoLogic } from './business/iso.logic';
import { IsoLogicI, IsoRepositoryI } from './business/iso.ports';
import { IsoMariaDBRepository } from './infrastructure/mariadb/iso.mariadb.repository';

@Module({
  imports: [MariaDbModule],
  controllers: [IsoController],
  providers: [
    { provide: IsoLogicI, useClass: IsoLogic },
    { provide: IsoRepositoryI, useClass: IsoMariaDBRepository },
  ],
  exports: [IsoLogicI, IsoRepositoryI],
})
export class IsoModule {}

