import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import type { Provider } from '../../business/provider.model';
import { ProviderLogicI } from '../../business/provider.ports';
import { ROLE } from '../../business/role-codes';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { RequireRole, RolesGuard } from './guards/roles.guard';

export class ProviderQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'active debe ser true o false.' })
  active?: boolean = true;

  @IsOptional()
  @IsString({ message: 'search debe ser texto.' })
  @MaxLength(100, { message: 'search no puede exceder 100 caracteres.' })
  search?: string;
}

@Controller('api/v1/providers')
@UseGuards(ClerkAuthGuard, RolesGuard)
@RequireRole(ROLE.RECURSOS_MATERIALES)
export class ProviderController {
  constructor(private readonly providerLogic: ProviderLogicI) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getProviders(@Query() query: ProviderQueryDto): Promise<Provider[]> {
    return await this.providerLogic.getProviders({
      activeOnly: query.active !== false,
      search: query.search,
    });
  }
}
