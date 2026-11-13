import { FundingSource } from './funding-source.model';

export abstract class FundingSourceLogicI {
  abstract getFundingSources(): Promise<FundingSource[]>;
}

export abstract class FundingSourceRepositoryI {
  abstract findAll(): Promise<FundingSource[]>;
}

