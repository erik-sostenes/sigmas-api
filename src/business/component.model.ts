import { AdministrativeUnit } from './administrative-unit.model';
import { AdministrativeUnitNotPersistedError } from './administrative-unit.errors';
import { InvalidComponentFieldError } from './component.errors';

export type ComponentID = number;

export type ComponentProps = {
  id?: ComponentID;
  code: string;
  name: string;
  administrativeUnit: AdministrativeUnit;
};

export type CreateComponentProps = Omit<ComponentProps, 'id'>;

const assertNonEmpty = (value: string, field: string): void => {
  if (!value || !value.trim()) {
    throw new InvalidComponentFieldError(field, 'no puede estar vacío');
  }
};

export class Component {
  readonly id?: ComponentID;
  readonly code: string;
  readonly name: string;
  readonly administrativeUnit: AdministrativeUnit;

  private constructor(props: ComponentProps) {
    this.id = props.id;
    this.code = props.code;
    this.name = props.name;
    this.administrativeUnit = props.administrativeUnit;
  }

  static create(props: CreateComponentProps): Component {
    assertNonEmpty(props.code, 'code');
    assertNonEmpty(props.name, 'name');

    if (!props.administrativeUnit.isPersisted) {
      throw new AdministrativeUnitNotPersistedError();
    }

    return new Component(props);
  }

  static rehydrate(props: ComponentProps): Component {
    return new Component(props);
  }

  get administrativeUnitId(): number {
    return this.administrativeUnit.id as number;
  }
}
