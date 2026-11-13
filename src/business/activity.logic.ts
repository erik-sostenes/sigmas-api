import { Injectable } from '@nestjs/common';
import { ActivityItem } from './activity.model';
import { ActivityLogicI, ActivityRepositoryI } from './activity.ports';

@Injectable()
export class ActivityLogic implements ActivityLogicI {
  constructor(private readonly activityRepository: ActivityRepositoryI) {}

  async getActivities(): Promise<ActivityItem[]> {
    return await this.activityRepository.findAll();
  }

  async getActivitiesByComponent(componentId: number): Promise<ActivityItem[]> {
    return await this.activityRepository.findByComponentId(componentId);
  }
}
