export type UserId = string;

export class User {
  readonly id?: UserId;
  readonly clerkId: string;
  readonly departmentId: number;
  readonly title: string | null;
  readonly email: string;
  readonly isActive: boolean;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  constructor(props: {
    id?: UserId;
    clerkId: string;
    departmentId: number;
    title?: string | null;
    email: string;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = props.id;
    this.clerkId = props.clerkId;
    this.departmentId = props.departmentId;
    this.title = props.title ?? null;
    this.email = props.email;
    this.isActive = props.isActive ?? true;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
