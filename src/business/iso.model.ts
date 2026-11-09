import { InvalidFieldError } from './purchase-request.errors';

export type IsoID = number;

export type IsoProps = {
  id?: IsoID;
  code: string;
  name: string;
};

export type CreateIsoProps = Omit<IsoProps, 'id'>;

const assertNonEmpty = (value: string, field: string): void => {
  if (!value || !value.trim()) {
    throw new InvalidFieldError(field, 'es obligatorio');
  }
};

export class Iso {
  readonly id?: IsoID;
  readonly code: string;
  readonly name: string;

  private constructor(props: IsoProps) {
    this.id = props.id;
    this.code = props.code;
    this.name = props.name;
  }

  static create(props: CreateIsoProps): Iso {
    assertNonEmpty(props.code, 'code');
    assertNonEmpty(props.name, 'name');

    return new Iso(props);
  }

  static rehydrate(props: IsoProps): Iso {
    return new Iso(props);
  }
}
