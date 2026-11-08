import { ComponentWithAdministrativeUnit } from './component.model';

export abstract class ComponentLogicI {
  abstract getComponents(): Promise<ComponentWithAdministrativeUnit[]>;
}

export abstract class ComponentRepositoryI {
  abstract findAllWithAdministrativeUnit(): Promise<
    ComponentWithAdministrativeUnit[]
  >;
}

