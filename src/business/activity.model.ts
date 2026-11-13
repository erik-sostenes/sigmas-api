import { InvalidActivityFieldError } from './activity.errors';

export type ActivityItemID = number;

export type ActivityItemProps = {
  id?: ActivityItemID;
  componentId: number;
  code: string;
  name: string;
};

const assertPositiveInt = (value: number, field: string): void => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new InvalidActivityFieldError(field, 'debe ser un entero mayor a 0');
  }
};

const assertNonEmpty = (value: string, field: string): void => {
  if (!value || !value.trim()) {
    throw new InvalidActivityFieldError(field, 'no puede estar vacío');
  }
};

export class ActivityItem {
  readonly id?: ActivityItemID;
  readonly componentId: number;
  readonly code: string;
  readonly name: string;

  private constructor(props: ActivityItemProps) {
    this.id = props.id;
    this.componentId = props.componentId;
    this.code = props.code;
    this.name = props.name;
  }

  static create(props: Omit<ActivityItemProps, 'id'>): ActivityItem {
    assertPositiveInt(props.componentId, 'componentId');
    assertNonEmpty(props.code, 'code');
    assertNonEmpty(props.name, 'name');
    return new ActivityItem(props);
  }

  static rehydrate(props: ActivityItemProps): ActivityItem {
    return new ActivityItem(props);
  }
}
