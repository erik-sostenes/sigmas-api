import { Injectable } from '@nestjs/common';
import { FundingSource } from './funding-source.model';
import {
  FundingSourceLogicI,
  FundingSourceRepositoryI,
} from './funding-source.ports';

@Injectable()
export class FundingSourceLogic implements FundingSourceLogicI {
  constructor(
    private readonly fundingSourceRepository: FundingSourceRepositoryI,
  ) {}

  async getFundingSources(): Promise<FundingSource[]> {
    return await this.fundingSourceRepository.findAll();
  }
}

