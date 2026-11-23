import { ActivityItem } from './activity.model';

// withActiveLeader: solo actividades con un líder activo. Es la misma condición
// que exige crear una solicitud, así que lo que se ofrece siempre se puede enviar.
export interface ActivityFilters {
  withActiveLeader?: boolean;
}

export abstract class ActivityLogicI {
  abstract getActivities(filters?: ActivityFilters): Promise<ActivityItem[]>;
  abstract getActivitiesByComponent(
    componentId: number,
    filters?: ActivityFilters,
  ): Promise<ActivityItem[]>;
}

export abstract class ActivityRepositoryI {
  abstract findAll(filters?: ActivityFilters): Promise<ActivityItem[]>;
  abstract findByComponentId(
    componentId: number,
    filters?: ActivityFilters,
  ): Promise<ActivityItem[]>;
  abstract findByIds(ids: number[]): Promise<ActivityItem[]>;
}
