import { Injectable } from '@nestjs/common';
import { Component } from './component.model';
import {
  ComponentFilters,
  ComponentLogicI,
  ComponentRepositoryI,
} from './component.ports';

@Injectable()
export class ComponentLogic implements ComponentLogicI {
  constructor(private readonly componentRepository: ComponentRepositoryI) {}

  async getComponents(filters?: ComponentFilters): Promise<Component[]> {
    return await this.componentRepository.findAll(filters);
  }
}
