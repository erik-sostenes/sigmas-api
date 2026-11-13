import { IsoStandard } from './iso.model';

export abstract class IsoLogicI {
  abstract getIsos(): Promise<IsoStandard[]>;
}

export abstract class IsoRepositoryI {
  abstract findAll(): Promise<IsoStandard[]>;
}

