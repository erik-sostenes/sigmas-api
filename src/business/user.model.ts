export type UserId = string;

export class User {
  readonly id?: UserId;
  readonly clerkId: string;
  readonly departmentId: number;
  readonly title: string | null;
  readonly email: string;
  readonly isActive: boolean;
  readonly roleCodes: string[];
  readonly activityCodes: string[];
  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  constructor(props: {
    id?: UserId;
    clerkId: string;
    departmentId: number;
    title?: string | null;
    email: string;
    isActive?: boolean;
    roleCodes?: string[];
    activityCodes?: string[];
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = props.id;
    this.clerkId = props.clerkId.trim();
    this.departmentId = props.departmentId;
    this.title = props.title ? props.title.trim() : null;
    this.email = props.email.trim().toLowerCase();
    this.isActive = props.isActive ?? true;
    this.roleCodes = Array.from(
      new Set((props.roleCodes ?? []).map((code) => code.trim())),
    ).filter((code) => code.length > 0);
    this.activityCodes = Array.from(
      new Set((props.activityCodes ?? []).map((code) => code.trim())),
    ).filter((code) => code.length > 0);
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
