import { Injectable } from '@nestjs/common';
import { ActivityItem } from './activity.model';
import {
  ActivityFilters,
  ActivityLogicI,
  ActivityRepositoryI,
} from './activity.ports';

@Injectable()
export class ActivityLogic implements ActivityLogicI {
  constructor(private readonly activityRepository: ActivityRepositoryI) {}

  async getActivities(filters?: ActivityFilters): Promise<ActivityItem[]> {
    return await this.activityRepository.findAll(filters);
  }

  async getActivitiesByComponent(
    componentId: number,
    filters?: ActivityFilters,
  ): Promise<ActivityItem[]> {
    return await this.activityRepository.findByComponentId(
      componentId,
      filters,
    );
  }
}
