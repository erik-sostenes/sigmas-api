import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'mariadb';
import { MARIADB_POOL } from './mariadb.connection';
import { BudgetItem } from '../../business/budget-item.model';
import { BudgetItemRepositoryI } from '../../business/budget-item.ports';

type BudgetItemRow = {
  id: number;
  code: string;
  name: string;
};

@Injectable()
export class BudgetItemMariaDBRepository implements BudgetItemRepositoryI {
  constructor(@Inject(MARIADB_POOL) private readonly pool: Pool) {}

  async findAll(): Promise<BudgetItem[]> {
    const rows = await this.pool.execute<BudgetItemRow[]>(
      `SELECT id, code, name
       FROM budget_items
       ORDER BY code ASC`,
    );

    return rows.map((row) => ({
      id: Number(row.id),
      code: row.code,
      name: row.name,
    }));
  }
}
