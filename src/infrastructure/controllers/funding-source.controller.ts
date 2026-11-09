import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { FundingSourceLogicI } from '../../business/funding-source.ports';
import { FundingSource } from '../../business/funding-source.model';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';

@Controller('api/v1/funding-sources')
@UseGuards(ClerkAuthGuard)
export class FundingSourceController {
  constructor(private readonly fundingSourceLogic: FundingSourceLogicI) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getFundingSources(): Promise<FundingSource[]> {
    return await this.fundingSourceLogic.getFundingSources();
  }
}

