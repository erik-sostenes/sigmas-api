import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ComponentLogicI } from '../../business/component.ports';
import { ComponentWithAdministrativeUnit } from '../../business/component.model';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';

@Controller('api/v1/components')
@UseGuards(ClerkAuthGuard)
export class ComponentController {
  constructor(private readonly componentLogic: ComponentLogicI) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getComponents(): Promise<ComponentWithAdministrativeUnit[]> {
    return await this.componentLogic.getComponents();
  }
}

