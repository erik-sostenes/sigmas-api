import { InvalidInvitationError } from './invitation.errors';

export type InvitationID = string;

export type InvitationProps = {
  id?: InvitationID;
  clerkInvitationId?: string | null;
  email: string;
  firstName: string;
  lastName: string;
  departmentId: number;
  componentId?: number | null;
  title: string;
  roleIds: number[];
  activityIds?: number[];
  createdAt?: Date;
};

export type CreateInvitationProps = Omit<
  InvitationProps,
  'id' | 'clerkInvitationId' | 'createdAt'
>;

export class Invitation {
  readonly id?: InvitationID;
  readonly clerkInvitationId: string | null;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly departmentId: number;
  readonly componentId: number | null;
  readonly title: string;
  readonly roleIds: number[];
  readonly activityIds: number[];
  readonly createdAt?: Date;

  private constructor(props: InvitationProps) {
    this.id = props.id;
    this.clerkInvitationId = props.clerkInvitationId ?? null;
    this.email = props.email.trim().toLowerCase();
    this.firstName = props.firstName.trim();
    this.lastName = props.lastName.trim();
    this.departmentId = props.departmentId;
    this.componentId = props.componentId ?? null;
    this.title = props.title.trim();
    this.roleIds = Array.from(new Set(props.roleIds));
    this.activityIds = Array.from(new Set(props.activityIds || []));
    this.createdAt = props.createdAt;
  }

  static create(props: CreateInvitationProps): Invitation {
    if (!props.email || !props.email.includes('@')) {
      throw new InvalidInvitationError('El correo electrónico no es válido.');
    }
    if (!props.firstName?.trim() || !props.lastName?.trim()) {
      throw new InvalidInvitationError(
        'El nombre y apellido son obligatorios.',
      );
    }
    if (!Number.isInteger(props.departmentId) || props.departmentId <= 0) {
      throw new InvalidInvitationError('El departamento es obligatorio.');
    }
    if (props.componentId !== null && props.componentId !== undefined) {
      if (!Number.isInteger(props.componentId) || props.componentId <= 0) {
        throw new InvalidInvitationError('El componente no es válido.');
      }
    }
    if (!props.roleIds || props.roleIds.length === 0) {
      throw new InvalidInvitationError('Debe asignar al menos un rol.');
    }

    return new Invitation(props);
  }

  static rehydrate(props: InvitationProps): Invitation {
    return new Invitation(props);
  }
}
