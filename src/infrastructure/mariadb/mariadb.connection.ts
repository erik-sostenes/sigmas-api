import { ConfigService } from '@nestjs/config';
import { createPool, type Pool } from 'mariadb';

export const MARIADB_POOL = Symbol('MARIADB_POOL');

export const mariadbConnection = {
  provide: MARIADB_POOL,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): Pool => {
    const databaseUrl = configService.get<unknown>('DATABASE_URL');

    if (typeof databaseUrl !== 'string' || databaseUrl.trim().length === 0) {
      throw new Error(
        'Configuracion MariaDB: DATABASE_URL debe contener un valor no vacio.',
      );
    }

    let url: URL;
    try {
      url = new URL(databaseUrl);
    } catch {
      throw new Error(
        'Configuracion MariaDB: DATABASE_URL no es una URL valida.',
      );
    }

    if (url.protocol !== 'mysql:' && url.protocol !== 'mariadb:') {
      throw new Error(
        'Configuracion MariaDB: DATABASE_URL debe usar el protocolo mysql:// o mariadb://.',
      );
    }

    const host = url.hostname;
    const user = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
    const port = url.port === '' ? 3306 : Number(url.port);

    if (host.length === 0) {
      throw new Error('Configuracion MariaDB: DATABASE_URL no incluye host.');
    }

    if (user.length === 0) {
      throw new Error(
        'Configuracion MariaDB: DATABASE_URL no incluye usuario.',
      );
    }

    if (database.length === 0) {
      throw new Error(
        'Configuracion MariaDB: DATABASE_URL no incluye nombre de base de datos.',
      );
    }

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(
        'Configuracion MariaDB: el puerto de DATABASE_URL debe ser un entero entre 1 y 65535.',
      );
    }

    return createPool({
      host,
      port,
      user,
      password,
      database,
      connectionLimit: 5,
      bigIntAsNumber: true,
      insertIdAsNumber: true,
    });
  },
};
