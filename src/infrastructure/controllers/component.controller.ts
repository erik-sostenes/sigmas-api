import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseBoolPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Component } from '../../business/component.model';
import { ComponentLogicI } from '../../business/component.ports';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';

// ?withLeader=true: solo componentes con al menos una actividad con líder activo.
// Sin el parámetro regresa todos, como los necesita el admin.
@Controller('api/v1/components')
@UseGuards(ClerkAuthGuard)
export class ComponentController {
  constructor(private readonly componentLogic: ComponentLogicI) {}

  @Get()
  async findAll(
    @Query('withLeader', new DefaultValuePipe(false), ParseBoolPipe)
    withLeader: boolean,
  ): Promise<Component[]> {
    return await this.componentLogic.getComponents({
      withActiveLeader: withLeader,
    });
  }
}
