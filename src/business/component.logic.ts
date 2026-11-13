import { Injectable } from '@nestjs/common';
import { Component } from './component.model';
import { ComponentLogicI, ComponentRepositoryI } from './component.ports';

@Injectable()
export class ComponentLogic implements ComponentLogicI {
  constructor(private readonly componentRepository: ComponentRepositoryI) {}

  async getComponents(): Promise<Component[]> {
    return await this.componentRepository.findAll();
  }
}
