import type { Provider } from './provider.model';

export interface ListProvidersFilter {
  activeOnly?: boolean;
  search?: string;
}

export abstract class ProviderLogicI {
  abstract getProviders(filter?: ListProvidersFilter): Promise<Provider[]>;
}

export abstract class ProviderRepositoryI {
  abstract findAll(filter?: ListProvidersFilter): Promise<Provider[]>;
  abstract findActiveByIds(ids: number[]): Promise<Provider[]>;
  abstract findActiveById(id: number): Promise<Provider | null>;
}
