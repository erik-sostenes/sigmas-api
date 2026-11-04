import { Invitation } from './invitation.model';

export interface InvitationActivityCheckItem {
  code: string;
  leaderId: string | null;
  leaderEmail: string | null;
}

// Left port
export abstract class InvitationLogicI {
  abstract send(invitation: Invitation): Promise<void>;
}

// Right port (Clerk)
export abstract class InvitationRepositoryI {
  abstract sendClerkInvitation(invitation: Invitation): Promise<void>;
}

// Right port (MariaDB verification)
export abstract class InvitationCatalogRepositoryI {
  abstract existsActiveDepartment(departmentId: number): Promise<boolean>;
  abstract existsUserByEmail(email: string): Promise<boolean>;
  abstract findExistingRoleCodes(roleCodes: string[]): Promise<string[]>;
  abstract findActivitiesByCodes(
    activityCodes: string[],
  ): Promise<InvitationActivityCheckItem[]>;
}
