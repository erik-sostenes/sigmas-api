import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PurchaseRequestModule } from './purchase-request.module';
import { InvitationModule } from './invitation.module';
import { UserModule } from './user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PurchaseRequestModule,
    InvitationModule,
    UserModule,
  ],
})
export class AppModule {}
