export class Invitation {
  readonly email: string;
  readonly departmentId: number;
  readonly title: string;

  constructor(props: { email: string; departmentId: number; title: string }) {
    this.email = props.email;
    this.departmentId = props.departmentId;
    this.title = props.title;
  }
}
