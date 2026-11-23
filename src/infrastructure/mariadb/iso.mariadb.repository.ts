import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'mariadb';
import { MARIADB_POOL } from './mariadb.connection';
import { IsoStandard } from '../../business/iso.model';
import { IsoRepositoryI } from '../../business/iso.ports';

type IsoRow = {
  id: number;
  name: string;
};

@Injectable()
export class IsoMariaDBRepository implements IsoRepositoryI {
  constructor(@Inject(MARIADB_POOL) private readonly pool: Pool) {}

  async findAll(): Promise<IsoStandard[]> {
    const rows = await this.pool.execute<IsoRow[]>(
      `SELECT id, name
       FROM isos
       ORDER BY id ASC`,
    );

    return rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
    }));
  }
}

