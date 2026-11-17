import { Injectable } from '@nestjs/common';
import { createClerkClient } from '@clerk/backend';
import { ClerkUserError } from '../../business/user.errors';
import { ClerkUserRepositoryI } from '../../business/user.ports';

@Injectable()
export class ClerkUserRepository implements ClerkUserRepositoryI {
  private readonly clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  async getPrimaryEmail(clerkId: string): Promise<string | null> {
    try {
      const user = await this.clerkClient.users.getUser(clerkId);
      return user.primaryEmailAddress?.emailAddress ?? null;
    } catch (error: any) {
      const clerkMessage = error.errors?.[0]?.message || error.message;
      throw new ClerkUserError(clerkMessage);
    }
  }
}
