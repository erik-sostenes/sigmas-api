import { ActivityItem } from './activity.model';

export abstract class ActivityLogicI {
  abstract getActivities(componentId?: number): Promise<ActivityItem[]>;
  abstract getActivitiesByComponent(
    componentId: number,
  ): Promise<ActivityItem[]>;
}

export abstract class ActivityRepositoryI {
  abstract findAll(): Promise<ActivityItem[]>;
  abstract findByComponentId(componentId: number): Promise<ActivityItem[]>;
  abstract findByIds(ids: number[]): Promise<ActivityItem[]>;
}
