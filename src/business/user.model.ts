export type UserId = string;

export class User {
  readonly id?: UserId;
  readonly clerkId: string;
  readonly departmentId: number;
  readonly title: string | null;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly isActive: boolean;
  readonly roleIds: number[];
  readonly roleCodes: string[];
  readonly activityIds: number[];
  readonly activityCodes: string[];
  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  constructor(props: {
    id?: UserId;
    clerkId: string;
    departmentId: number;
    title?: string | null;
    firstName: string;
    lastName: string;
    email: string;
    isActive?: boolean;
    roleIds?: number[];
    roleCodes?: string[];
    activityIds?: number[];
    activityCodes?: string[];
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = props.id;
    this.clerkId = props.clerkId.trim();
    this.departmentId = props.departmentId;
    this.title = props.title ? props.title.trim() : null;
    this.firstName = props.firstName.trim();
    this.lastName = props.lastName.trim();
    this.email = props.email.trim().toLowerCase();
    this.isActive = props.isActive ?? true;
    this.roleIds = Array.from(new Set(props.roleIds ?? []));
    this.roleCodes = Array.from(
      new Set((props.roleCodes ?? []).map((code) => code.trim())),
    ).filter((code) => code.length > 0);
    this.activityIds = Array.from(
      new Set((props.activityIds ?? []).map(Number)),
    ).filter((id) => Number.isInteger(id) && id > 0);
    this.activityCodes = Array.from(
      new Set((props.activityCodes ?? []).map((code) => code.trim())),
    ).filter((code) => code.length > 0);
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
