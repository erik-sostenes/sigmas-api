import { InvalidAdministrativeUnitFieldError } from './administrative-unit.errors';

export type AdministrativeUnitID = number;

export type AdministrativeUnitProps = {
  id?: AdministrativeUnitID;
  code: string;
  name: string;
};

const assertNonEmpty = (value: string, field: string): void => {
  if (!value || !value.trim()) {
    throw new InvalidAdministrativeUnitFieldError(
      field,
      'no puede estar vacío',
    );
  }
};

export class AdministrativeUnit {
  readonly id?: AdministrativeUnitID;
  readonly code: string;
  readonly name: string;

  private constructor(props: AdministrativeUnitProps) {
    this.id = props.id;
    this.code = props.code;
    this.name = props.name;
  }

  static create(
    props: Omit<AdministrativeUnitProps, 'id'>,
  ): AdministrativeUnit {
    assertNonEmpty(props.code, 'code');
    assertNonEmpty(props.name, 'name');
    return new AdministrativeUnit(props);
  }

  static rehydrate(props: AdministrativeUnitProps): AdministrativeUnit {
    return new AdministrativeUnit(props);
  }

  get isPersisted(): boolean {
    return this.id !== undefined;
  }
}
