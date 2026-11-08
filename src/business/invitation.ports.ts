import { Invitation } from './invitation.model';

export interface InvitationActivityCheckItem {
  id: number;
  code: string;
  leaderId: string | null;
  leaderEmail: string | null;
}

export interface RoleLookupItem {
  id: number;
  code: string;
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
  abstract findRolesByIds(roleIds: number[]): Promise<RoleLookupItem[]>;
  abstract findRolesByCodes(roleCodes: string[]): Promise<RoleLookupItem[]>;
  abstract findActivitiesByCodes(
    activityCodes: string[],
  ): Promise<InvitationActivityCheckItem[]>;
  abstract findActivitiesByIds(
    activityIds: number[],
  ): Promise<InvitationActivityCheckItem[]>;
}
