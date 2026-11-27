import { Injectable } from '@nestjs/common';
import type { Provider } from './provider.model';
import {
  type ListProvidersFilter,
  ProviderLogicI,
  ProviderRepositoryI,
} from './provider.ports';

@Injectable()
export class ProviderLogic implements ProviderLogicI {
  constructor(private readonly providerRepository: ProviderRepositoryI) {}

  async getProviders(filter?: ListProvidersFilter): Promise<Provider[]> {
    return await this.providerRepository.findAll(filter);
  }
}
