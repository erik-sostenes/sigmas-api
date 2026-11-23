import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'mariadb';
import { MARIADB_POOL } from './mariadb.connection';
import { MeasurementUnit } from '../../business/measurement-unit.model';
import { MeasurementUnitRepositoryI } from '../../business/measurement-unit.ports';

type MeasurementUnitRow = {
  id: number;
  name: string;
};

@Injectable()
export class MeasurementUnitMariaDBRepository
  implements MeasurementUnitRepositoryI
{
  constructor(@Inject(MARIADB_POOL) private readonly pool: Pool) {}

  async findAll(): Promise<MeasurementUnit[]> {
    const rows = await this.pool.execute<MeasurementUnitRow[]>(
      `SELECT id, name
       FROM measurement_units
       ORDER BY id ASC`,
    );

    return rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
    }));
  }
}
