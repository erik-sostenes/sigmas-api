import { InvalidUserFieldError } from './user.errors';

export type UserId = string;

export type UserProps = {
  id?: UserId;
  clerkId: string;
  departmentId: number;
  componentId?: number | null;
  title?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  isActive?: boolean;
  roleIds: number[];
  activityIds: number[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type CreateUserProps = Omit<UserProps, 'id' | 'createdAt' | 'updatedAt'>;

const assertNonEmpty = (value: string, field: string): void => {
  if (!value || !value.trim())
    throw new InvalidUserFieldError(field, 'es obligatorio');
};

const assertPositiveInt = (value: number, field: string): void => {
  if (!Number.isInteger(value) || value <= 0)
    throw new InvalidUserFieldError(field, 'debe ser un entero mayor a 0');
};

export class User {
  readonly id?: UserId;
  readonly clerkId: string;
  readonly departmentId: number;
  readonly componentId: number | null;
  readonly title: string | null;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly isActive: boolean;
  readonly roleIds: number[];
  readonly activityIds: number[];
  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  private constructor(props: UserProps) {
    this.id = props.id;
    this.clerkId = props.clerkId.trim();
    this.departmentId = props.departmentId;
    this.componentId = props.componentId ?? null;
    this.title = props.title ? props.title.trim() : null;
    this.firstName = props.firstName.trim();
    this.lastName = props.lastName.trim();
    this.email = props.email.trim().toLowerCase();
    this.isActive = props.isActive ?? true;
    this.roleIds = Array.from(new Set(props.roleIds));
    this.activityIds = Array.from(new Set(props.activityIds));
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: CreateUserProps): User {
    assertNonEmpty(props.clerkId, 'clerkId');
    assertNonEmpty(props.firstName, 'firstName');
    assertNonEmpty(props.lastName, 'lastName');
    assertNonEmpty(props.email, 'email');
    assertPositiveInt(props.departmentId, 'departmentId');

    if (props.componentId !== undefined && props.componentId !== null) {
      assertPositiveInt(props.componentId, 'componentId');
    }

    if (!props.roleIds || props.roleIds.length === 0) {
      throw new InvalidUserFieldError('roleIds', 'debe tener al menos un rol');
    }
    props.roleIds.forEach((id) => assertPositiveInt(id, 'roleIds'));
    (props.activityIds || []).forEach((id) =>
      assertPositiveInt(id, 'activityIds'),
    );

    return new User({
      ...props,
      roleIds: props.roleIds,
      activityIds: props.activityIds || [],
    });
  }

  static rehydrate(props: UserProps): User {
    return new User(props);
  }
}
