import { Module } from '@nestjs/common';
import { MariaDbModule } from './mariadb.module';
import { ViewerRepositoryI } from './business/viewer.ports';
import { ViewerMariaDBRepository } from './infrastructure/mariadb/viewer.mariadb.repository';

// Importar en los módulos cuyos controllers usan RolesGuard.
@Module({
  imports: [MariaDbModule],
  providers: [
    {
      provide: ViewerRepositoryI,
      useClass: ViewerMariaDBRepository,
    },
  ],
  exports: [ViewerRepositoryI],
})
export class ViewerModule {}
