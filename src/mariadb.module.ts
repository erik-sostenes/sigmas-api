import { Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import type { Pool } from 'mariadb';
import {
  MARIADB_POOL,
  mariadbConnection,
} from './infrastructure/mariadb/mariadb.connection';

@Module({
  imports: [ConfigModule],
  providers: [mariadbConnection],
  exports: [MARIADB_POOL],
})
export class MariaDbModule implements OnApplicationShutdown {
  constructor(@Inject(MARIADB_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
