import { Component } from './component.model';

// withActiveLeader: solo componentes con al menos una actividad con líder activo.
// Se basa en las actividades, no en el líder del componente (ese es solo de seguimiento).
export interface ComponentFilters {
  withActiveLeader?: boolean;
}

export abstract class ComponentLogicI {
  abstract getComponents(filters?: ComponentFilters): Promise<Component[]>;
}

export abstract class ComponentRepositoryI {
  abstract findAll(filters?: ComponentFilters): Promise<Component[]>;
  abstract exists(id: number): Promise<boolean>;
}
