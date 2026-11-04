export class Invitation {
  readonly email: string;
  readonly departmentId: number;
  readonly title: string;
  readonly roleCodes: string[];
  readonly activityCodes: string[];

  constructor(props: {
    email: string;
    departmentId: number;
    title: string;
    roleCodes: string[];
    activityCodes?: string[];
  }) {
    this.email = props.email.trim().toLowerCase();
    this.departmentId = props.departmentId;
    this.title = props.title.trim();
    this.roleCodes = props.roleCodes.map((code) => code.trim());
    this.activityCodes = (props.activityCodes ?? []).map((code) => code.trim());
  }
}
