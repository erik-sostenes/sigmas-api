import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { InvitationLogicI } from '../../business/invitation.ports';
import { Invitation } from '../../business/invitation.model';
import { CreateInvitationDto } from './invitation.dto';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { InvitationExceptionFilter } from './invitation-exception.filter';

@Controller('api/v1/invitations')
@UseGuards(ClerkAuthGuard, SuperAdminGuard)
@UseFilters(InvitationExceptionFilter)
export class InvitationController {
  constructor(private readonly invitationLogic: InvitationLogicI) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateInvitationDto): Promise<{ message: string }> {
    const invitation = new Invitation({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      departmentId: dto.departmentId,
      title: dto.title,
      roleIds: dto.roleIds,
      roleCodes: dto.roleCodes,
      activityIds: dto.activityIds,
      activityCodes: dto.activityCodes ?? [],
    });

    await this.invitationLogic.send(invitation);

    return { message: 'Invitación enviada correctamente' };
  }
}
