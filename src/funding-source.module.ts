import { Module } from '@nestjs/common';
import { MariaDbModule } from './mariadb.module';
import { FundingSourceController } from './infrastructure/controllers/funding-source.controller';
import {
  FundingSourceLogicI,
  FundingSourceRepositoryI,
} from './business/funding-source.ports';
import { FundingSourceLogic } from './business/funding-source.logic';
import { FundingSourceMariaDBRepository } from './infrastructure/mariadb/funding-source.mariadb.repository';

@Module({
  imports: [MariaDbModule],
  controllers: [FundingSourceController],
  providers: [
    {
      provide: FundingSourceLogicI,
      useClass: FundingSourceLogic,
    },
    {
      provide: FundingSourceRepositoryI,
      useClass: FundingSourceMariaDBRepository,
    },
  ],
  exports: [FundingSourceLogicI],
})
export class FundingSourceModule {}

