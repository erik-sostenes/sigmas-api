import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'mariadb';
import { MARIADB_POOL } from './mariadb.connection';
import { FundingSourceRepositoryI } from '../../business/funding-source.ports';
import { FundingSource } from '../../business/funding-source.model';

type FundingSourceRow = {
  id: number;
  code: string;
  name: string;
};

@Injectable()
export class FundingSourceMariaDBRepository
  implements FundingSourceRepositoryI
{
  constructor(@Inject(MARIADB_POOL) private readonly pool: Pool) {}

  async findAll(): Promise<FundingSource[]> {
    const rows = await this.pool.execute<FundingSourceRow[]>(
      `SELECT id, code, name
       FROM funding_sources
       ORDER BY code ASC`,
    );

    return rows.map((row) => ({
      id: Number(row.id),
      code: row.code,
      name: row.name,
    }));
  }
}

