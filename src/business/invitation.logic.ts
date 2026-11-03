import { Injectable } from '@nestjs/common';
import { Invitation } from './invitation.model';
import { InvitationLogicI, InvitationRepositoryI } from './invitation.ports';

@Injectable()
export class InvitationLogic implements InvitationLogicI {
  constructor(private readonly invitationRepository: InvitationRepositoryI) {}

  async send(invitation: Invitation): Promise<void> {
    // TODO:
    // - verificar en tu BD MySQL si el departmentId existe.
    // - Validar que el id del rol sea valido, que este viva en nuestro sistema

    await this.invitationRepository.sendClerkInvitation(invitation);
  }
}
