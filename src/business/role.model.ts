import { InvalidRoleFieldError } from './role.errors';

export type RoleID = number;

export type RoleProps = {
  id?: RoleID;
  code: string;
  name: string;
  requiresActivities: boolean;
  requiresComponent: boolean;
};

const assertNonEmpty = (value: string, field: string): void => {
  if (!value || !value.trim()) {
    throw new InvalidRoleFieldError(field, 'no puede estar vacío');
  }
};

export class Role {
  readonly id?: RoleID;
  readonly code: string;
  readonly name: string;
  readonly requiresActivities: boolean;
  readonly requiresComponent: boolean;

  private constructor(props: RoleProps) {
    this.id = props.id;
    this.code = props.code;
    this.name = props.name;
    this.requiresActivities = props.requiresActivities;
    this.requiresComponent = props.requiresComponent;
  }

  static create(props: Omit<RoleProps, 'id'>): Role {
    assertNonEmpty(props.code, 'code');
    assertNonEmpty(props.name, 'name');
    return new Role(props);
  }

  static rehydrate(props: RoleProps): Role {
    return new Role({
      ...props,
      requiresActivities: Boolean(props.requiresActivities),
      requiresComponent: Boolean(props.requiresComponent),
    });
  }
}
