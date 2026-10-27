import { Inject } from '@nestjs/common';
import type { Pool } from 'mariadb';
import { MARIADB_POOL } from './mariadb.connection';

export type Row = Record<string, any>;

export abstract class MariaDBRepository<T> {
  constructor(@Inject(MARIADB_POOL) protected readonly pool: Pool) {}

  protected abstract toDomain(row: Row): T;

  protected async searchOne(
    sql: string,
    params: unknown[] = [],
  ): Promise<T | null> {
    const rows = await this.query(sql, params);

    return rows.length && rows[0] ? this.toDomain(rows[0]) : null;
  }

  protected async searchMany(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const rows = await this.query(sql, params);

    return rows.map((row) => this.toDomain(row));
  }

  // INSERT ... RETURNING / UPDATE / DELETE
  protected async execute(sql: string, params: unknown[] = []): Promise<Row[]> {
    return (await this.pool.execute(sql, params)) as Row[];
  }

  private async query(sql: string, params: unknown[]): Promise<Row[]> {
    return (await this.pool.execute(sql, params)) as Row[];
  }

  protected placeholders(values: unknown[]): string {
    return values.map(() => '?').join(', ');
  }
}
