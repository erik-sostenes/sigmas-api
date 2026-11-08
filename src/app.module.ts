import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PurchaseRequestModule } from './purchase-request.module';
import { InvitationModule } from './invitation.module';
import { UserModule } from './user.module';
import { UserAssignmentModule } from './user-assignment.module';
import { IsoModule } from './iso.module';
import { ComponentModule } from './component.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PurchaseRequestModule,
    InvitationModule,
    UserModule,
    UserAssignmentModule,
    IsoModule,
    ComponentModule,
  ],
})
export class AppModule {}
