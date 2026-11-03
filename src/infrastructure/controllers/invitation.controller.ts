import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InvitationLogicI } from '../../business/invitation.ports';
import { Invitation } from '../../business/invitation.model';
import { CreateInvitationDto } from './invitation.dto';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';

@Controller('api/v1/invitations')
@UseGuards(ClerkAuthGuard, SuperAdminGuard)
export class InvitationController {
  constructor(private readonly invitationLogic: InvitationLogicI) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateInvitationDto): Promise<{ message: string }> {
    const invitation = new Invitation({
      email: dto.email,
      departmentId: dto.departmentId,
      title: dto.title,
    });

    await this.invitationLogic.send(invitation);

    return { message: 'Invitación enviada correctamente' };
  }
}
