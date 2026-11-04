import { Injectable } from '@nestjs/common';
import { createClerkClient } from '@clerk/backend';
import { InvitationRepositoryI } from '../../business/invitation.ports';
import { Invitation } from '../../business/invitation.model';
import { ClerkInvitationError } from '../../business/invitation.errors';

const DEFAULT_REDIRECT_URL = 'http://localhost:5173/user-register';

@Injectable()
export class ClerkInvitationRepository implements InvitationRepositoryI {
  private readonly clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  async sendClerkInvitation(invitation: Invitation): Promise<void> {
    const redirectUrl =
      process.env.CLERK_INVITATION_REDIRECT_URL?.trim() || DEFAULT_REDIRECT_URL;

    try {
      await this.clerkClient.invitations.createInvitation({
        emailAddress: invitation.email,
        publicMetadata: {
          departmentId: invitation.departmentId,
          title: invitation.title,
          roleCodes: invitation.roleCodes,
          activityCodes: invitation.activityCodes,
        },
        redirectUrl,
      });
    } catch (error: any) {
      const clerkMessage = error.errors?.[0]?.message || error.message;
      throw new ClerkInvitationError(clerkMessage);
    }
  }
}
