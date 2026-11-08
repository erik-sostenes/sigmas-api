export class Invitation {
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly departmentId: number;
  readonly title: string;
  roleIds: number[];
  roleCodes: string[];
  activityIds: number[];
  readonly activityCodes: string[];

  constructor(props: {
    email: string;
    firstName: string;
    lastName: string;
    departmentId: number;
    title: string;
    roleIds?: number[];
    roleCodes?: string[];
    activityIds?: number[];
    activityCodes?: string[];
  }) {
    this.email = props.email.trim().toLowerCase();
    this.firstName = props.firstName.trim();
    this.lastName = props.lastName.trim();
    this.departmentId = props.departmentId;
    this.title = props.title.trim();
    this.roleIds = props.roleIds ?? [];
    this.roleCodes = (props.roleCodes ?? []).map((code) => code.trim());
    this.activityIds = props.activityIds ?? [];
    this.activityCodes = (props.activityCodes ?? []).map((code) => code.trim());
  }
}
