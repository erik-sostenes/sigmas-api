import { Invitation } from './invitation.model';

// Left port
export abstract class InvitationLogicI {
  abstract send(invitation: Invitation): Promise<void>;
}

// Right port
export abstract class InvitationRepositoryI {
  abstract sendClerkInvitation(invitation: Invitation): Promise<void>;
}
