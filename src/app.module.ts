import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PurchaseRequestModule } from './purchase-request.module';
import { MariaDbModule } from './mariadb.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MariaDbModule,
    PurchaseRequestModule,
  ],
})
export class AppModule {}
