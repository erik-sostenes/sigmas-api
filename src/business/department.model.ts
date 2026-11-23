import { InvalidDepartmentFieldError } from './department.errors';

export type DepartmentID = number;

export type DepartmentProps = {
  id?: DepartmentID;
  name: string;
};

const assertNonEmpty = (value: string, field: string): void => {
  if (!value || !value.trim()) {
    throw new InvalidDepartmentFieldError(field, 'no puede estar vacío');
  }
};

export class Department {
  readonly id?: DepartmentID;
  readonly name: string;

  private constructor(props: DepartmentProps) {
    this.id = props.id;
    this.name = props.name;
  }

  static create(props: Omit<DepartmentProps, 'id'>): Department {
    assertNonEmpty(props.name, 'name');
    return new Department(props);
  }

  static rehydrate(props: DepartmentProps): Department {
    return new Department(props);
  }
}
