import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ROLE } from '../../business/role-codes';
import type { Viewer } from '../../business/viewer.model';
import {
  ComparativeChartLogicI,
  type ComparativeChartDetailView,
  type PaginatedComparativeCharts,
} from '../../business/comparative-chart.ports';
import {
  CreateComparativeChartDto,
  ListComparativeChartsQueryDto,
  UpdateComparativeChartDto,
} from './comparative-chart.dto';
import { ComparativeChartExceptionFilter } from './comparative-chart-exception.filter';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { CurrentViewer, RequireRole, RolesGuard } from './guards/roles.guard';

@Controller('api/v1/comparative-charts')
@UseGuards(ClerkAuthGuard, RolesGuard)
@RequireRole(ROLE.RECURSOS_MATERIALES)
@UseFilters(ComparativeChartExceptionFilter)
export class ComparativeChartController {
  constructor(private readonly comparativeChartLogic: ComparativeChartLogicI) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(
    @Query() query: ListComparativeChartsQueryDto,
  ): Promise<PaginatedComparativeCharts> {
    return await this.comparativeChartLogic.list({
      status: query.status,
      statusGroup: query.statusGroup,
      search: query.search?.trim() || undefined,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getById(
    @CurrentViewer() viewer: Viewer,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ComparativeChartDetailView> {
    return await this.comparativeChartLogic.getById(id, viewer.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentViewer() viewer: Viewer,
    @Body() dto: CreateComparativeChartDto,
  ): Promise<ComparativeChartDetailView> {
    return await this.comparativeChartLogic.create(viewer.userId, dto);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @CurrentViewer() viewer: Viewer,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateComparativeChartDto,
  ): Promise<ComparativeChartDetailView> {
    return await this.comparativeChartLogic.update(id, viewer.userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.comparativeChartLogic.delete(id);
  }
}
