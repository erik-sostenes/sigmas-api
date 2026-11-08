import { Injectable } from '@nestjs/common';
import { ComponentWithAdministrativeUnit } from './component.model';
import { ComponentLogicI, ComponentRepositoryI } from './component.ports';

@Injectable()
export class ComponentLogic implements ComponentLogicI {
  constructor(private readonly componentRepository: ComponentRepositoryI) {}

  async getComponents(): Promise<ComponentWithAdministrativeUnit[]> {
    return await this.componentRepository.findAllWithAdministrativeUnit();
  }
}

