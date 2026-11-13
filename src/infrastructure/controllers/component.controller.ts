import { Controller, Get, UseGuards } from '@nestjs/common';
import { Component } from '../../business/component.model';
import { ComponentLogicI } from '../../business/component.ports';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';

@Controller('api/v1/components')
@UseGuards(ClerkAuthGuard)
export class ComponentController {
  constructor(private readonly componentLogic: ComponentLogicI) {}

  @Get()
  async findAll(): Promise<Component[]> {
    return await this.componentLogic.getComponents();
  }
}
