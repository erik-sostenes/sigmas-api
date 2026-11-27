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
import { MeasurementUnitModule } from './measurement-unit.module';
import { BudgetItemModule } from './budget-item.module';
import { ProviderModule } from './provider.module';
import { ComparativeChartModule } from './comparative-chart.module';

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
    MeasurementUnitModule,
    BudgetItemModule,
    ProviderModule,
    ComparativeChartModule,
  ],
})
export class AppModule {}
