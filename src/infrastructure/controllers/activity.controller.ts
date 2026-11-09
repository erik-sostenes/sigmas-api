import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ActivityLogicI } from '../../business/activity.ports';
import { ActivityItem } from '../../business/activity.model';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';

@Controller()
@UseGuards(ClerkAuthGuard)
export class ActivityController {
  constructor(private readonly activityLogic: ActivityLogicI) {}

  @Get('api/v1/activities')
  @HttpCode(HttpStatus.OK)
  async getActivities(
    @Query('componentId') componentId?: string,
  ): Promise<ActivityItem[]> {
    const parsedId =
      componentId !== undefined && componentId !== ''
        ? Number.parseInt(componentId, 10)
        : undefined;
    return await this.activityLogic.getActivities(parsedId);
  }

  @Get('api/v1/components/:componentId/activities')
  @HttpCode(HttpStatus.OK)
  async getActivitiesByComponent(
    @Param('componentId', ParseIntPipe) componentId: number,
  ): Promise<ActivityItem[]> {
    return await this.activityLogic.getActivitiesByComponent(componentId);
  }
}

