import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ActivityItem } from '../../business/activity.model';
import { ActivityLogicI } from '../../business/activity.ports';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';

// ?withLeader=true: solo actividades con líder activo (las que se pueden usar en una solicitud).
// Sin el parámetro regresa todas, como las necesita el admin.
@Controller('api/v1/activities')
@UseGuards(ClerkAuthGuard)
export class ActivityController {
  constructor(private readonly activityLogic: ActivityLogicI) {}

  @Get()
  async findAll(
    @Query('withLeader', new DefaultValuePipe(false), ParseBoolPipe)
    withLeader: boolean,
  ): Promise<ActivityItem[]> {
    return await this.activityLogic.getActivities({
      withActiveLeader: withLeader,
    });
  }

  @Get('component/:componentId')
  async findByComponent(
    @Param('componentId', ParseIntPipe) componentId: number,
    @Query('withLeader', new DefaultValuePipe(false), ParseBoolPipe)
    withLeader: boolean,
  ): Promise<ActivityItem[]> {
    return await this.activityLogic.getActivitiesByComponent(componentId, {
      withActiveLeader: withLeader,
    });
  }
}
