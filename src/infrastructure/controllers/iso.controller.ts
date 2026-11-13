import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { IsoLogicI } from '../../business/iso.ports';
import { IsoStandard } from '../../business/iso.model';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';

@Controller('api/v1/isos')
@UseGuards(ClerkAuthGuard)
export class IsoController {
  constructor(private readonly isoLogic: IsoLogicI) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getIsos(): Promise<IsoStandard[]> {
    return await this.isoLogic.getIsos();
  }
}

