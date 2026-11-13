import { Injectable } from '@nestjs/common';
import { createClerkClient } from '@clerk/backend';
import { Invitation } from '../../business/invitation.model';
import { ClerkInvitationError } from '../../business/invitation.errors';
import { ClerkInvitationRepositoryI } from '../../business/invitation.ports';

const DEFAULT_REDIRECT_URL = 'http://localhost:5173/user-register';

@Injectable()
export class ClerkInvitationRepository implements ClerkInvitationRepositoryI {
  private readonly clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  async sendClerkInvitation(invitation: Invitation): Promise<string> {
    const redirectUrl =
      process.env.CLERK_INVITATION_REDIRECT_URL?.trim() || DEFAULT_REDIRECT_URL;

    const publicMetadata = {
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      departmentId: invitation.departmentId,
      title: invitation.title,
      roleIds: invitation.roleIds,
      activityIds: invitation.activityIds,
      ...(invitation.componentId && { componentId: invitation.componentId }),
    };

    try {
      const response = await this.clerkClient.invitations.createInvitation({
        emailAddress: invitation.email,
        publicMetadata,
        redirectUrl,
      });

      return response.id;
    } catch (error: any) {
      const clerkMessage = error.errors?.[0]?.message || error.message;
      throw new ClerkInvitationError(clerkMessage);
    }
  }

  async revokeClerkInvitation(clerkInvitationId: string): Promise<void> {
    await this.clerkClient.invitations.revokeInvitation(clerkInvitationId);
  }
}
