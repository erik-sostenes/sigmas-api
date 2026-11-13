import { Invitation } from './invitation.model';

export abstract class InvitationLogicI {
  abstract send(invitation: Invitation): Promise<void>;
  abstract cancel(invitationId: string): Promise<void>;
}

// Base de datos
export abstract class InvitationRepositoryI {
  abstract save(invitation: Invitation): Promise<string>; // Retorna el UUID
  abstract delete(id: string): Promise<void>;
  abstract findById(id: string): Promise<Invitation | null>;
  abstract existsByEmail(email: string): Promise<boolean>;
  abstract hasComponentLeader(componentId: number): Promise<boolean>;
  abstract hasActivityLeader(activityIds: number[]): Promise<boolean>;
  abstract findByEmail(email: string): Promise<Invitation | null>;
}

// Clerk
export abstract class ClerkInvitationRepositoryI {
  abstract sendClerkInvitation(invitation: Invitation): Promise<string>; // Retorna el clerk_invitation_id
  abstract revokeClerkInvitation(clerkInvitationId: string): Promise<void>;
}
