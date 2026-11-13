import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PurchaseRequestModule } from './purchase-request.module';
import { InvitationModule } from './invitation.module';
import { UserModule } from './user.module';
import { IsoModule } from './iso.module';
import { ComponentModule } from './component.module';
import { FundingSourceModule } from './funding-source.module';
import { DepartmentModule } from './department.module';
import { RoleModule } from './role.module';
import { ActivityModule } from './activity.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PurchaseRequestModule,
    InvitationModule,
    UserModule,
    IsoModule,
    ComponentModule,
    ActivityModule,
    DepartmentModule,
    RoleModule,
    FundingSourceModule,
  ],
})
export class AppModule {}
