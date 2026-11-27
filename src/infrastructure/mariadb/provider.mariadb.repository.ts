import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'mariadb';
import { MARIADB_POOL } from './mariadb.connection';
import type { Provider } from '../../business/provider.model';
import {
  type ListProvidersFilter,
  ProviderRepositoryI,
} from '../../business/provider.ports';

type ProviderRow = {
  id: number;
  rfc: string;
  name: string;
  is_active: number | boolean;
};

@Injectable()
export class ProviderMariaDBRepository implements ProviderRepositoryI {
  constructor(@Inject(MARIADB_POOL) private readonly pool: Pool) {}

  async findAll(filter?: ListProvidersFilter): Promise<Provider[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter?.activeOnly !== false) {
      conditions.push('is_active = TRUE');
    }

    const search = filter?.search?.trim();
    if (search) {
      conditions.push('(name LIKE ? OR rfc LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereSql =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await this.pool.execute<ProviderRow[]>(
      `SELECT id, rfc, name, is_active
       FROM providers
       ${whereSql}
       ORDER BY name ASC`,
      params,
    );

    return rows.map((row) => this.mapRow(row));
  }

  async findActiveByIds(ids: number[]): Promise<Provider[]> {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(', ');
    const rows = await this.pool.execute<ProviderRow[]>(
      `SELECT id, rfc, name, is_active
       FROM providers
       WHERE is_active = TRUE AND id IN (${placeholders})`,
      ids,
    );
    return rows.map((row) => this.mapRow(row));
  }

  async findActiveById(id: number): Promise<Provider | null> {
    const rows = await this.pool.execute<ProviderRow[]>(
      `SELECT id, rfc, name, is_active
       FROM providers
       WHERE is_active = TRUE AND id = ?
       LIMIT 1`,
      [id],
    );
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  private mapRow(row: ProviderRow): Provider {
    return {
      id: Number(row.id),
      rfc: row.rfc,
      name: row.name,
      isActive: Boolean(row.is_active),
    };
  }
}
