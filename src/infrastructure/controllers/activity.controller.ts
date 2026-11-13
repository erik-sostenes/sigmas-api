import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ActivityItem } from '../../business/activity.model';
import { ActivityLogicI } from '../../business/activity.ports';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';

@Controller('api/v1/activities')
@UseGuards(ClerkAuthGuard)
export class ActivityController {
  constructor(private readonly activityLogic: ActivityLogicI) {}

  @Get()
  async findAll(): Promise<ActivityItem[]> {
    return await this.activityLogic.getActivities();
  }

  @Get('component/:componentId')
  async findByComponent(
    @Param('componentId', ParseIntPipe) componentId: number,
  ): Promise<ActivityItem[]> {
    return await this.activityLogic.getActivitiesByComponent(componentId);
  }
}
