import { Injectable } from '@nestjs/common';
import { IsoStandard } from './iso.model';
import { IsoLogicI, IsoRepositoryI } from './iso.ports';

@Injectable()
export class IsoLogic implements IsoLogicI {
  constructor(private readonly isoRepository: IsoRepositoryI) {}

  async getIsos(): Promise<IsoStandard[]> {
    return await this.isoRepository.findAll();
  }
}

