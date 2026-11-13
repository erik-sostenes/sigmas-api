import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseFilters,
} from '@nestjs/common';
import { InvitationLogicI } from '../../business/invitation.ports';
import { Invitation } from '../../business/invitation.model';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { InvitationExceptionFilter } from './invitation-exception.filter';
import { CreateInvitationDto } from './invitation.dto';

@Controller('api/v1/invitations')
@UseGuards(ClerkAuthGuard, SuperAdminGuard)
@UseFilters(InvitationExceptionFilter)
export class InvitationController {
  constructor(private readonly invitationLogic: InvitationLogicI) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateInvitationDto): Promise<{ message: string }> {
    const invitation = Invitation.create({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      departmentId: dto.departmentId,
      componentId: dto.componentId ?? null,
      title: dto.title,
      roleIds: dto.roleIds,
      activityIds: dto.activityIds ?? [],
    });

    await this.invitationLogic.send(invitation);

    return { message: 'Invitación enviada correctamente' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancel(@Param('id') id: string): Promise<void> {
    await this.invitationLogic.cancel(id);
  }
}
