import { Injectable } from '@nestjs/common';
import { createClerkClient } from '@clerk/backend';
import { InvitationRepositoryI } from '../../business/invitation.ports';
import { Invitation } from '../../business/invitation.model';
import { ClerkInvitationError } from '../../business/invitation.errors';

@Injectable()
export class ClerkInvitationRepository implements InvitationRepositoryI {
  // 2. Crea la instancia
  private readonly clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  async sendClerkInvitation(invitation: Invitation): Promise<void> {
    try {
      // 3. Usa la instancia
      await this.clerkClient.invitations.createInvitation({
        emailAddress: invitation.email,
        // TODO: especificar los roles
        publicMetadata: {
          departmentId: invitation.departmentId,
          title: invitation.title,
        },

        // TODO: manejar esta ruta como una variable de entorno
        redirectUrl: 'http://localhost:5173/user-register',
      });
    } catch (error: any) {
      const clerkMessage = error.errors?.[0]?.message || error.message;
      throw new ClerkInvitationError(clerkMessage);
    }
  }
}
