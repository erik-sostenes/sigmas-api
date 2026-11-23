import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  type InboxFilters,
  type InboxSummary,
  type PaginatedPurchaseRequests,
  type PurchaseRequestView,
  PurchaseRequestLogicI,
} from '../../business/purchase-request.ports';
import { PurchaseRequest } from '../../business/purchase-request.model';
import { RequestComponent } from '../../business/request-component.model';
import { ProductItem } from '../../business/product-item.model';
import { ROLE } from '../../business/role-codes';
import type { Viewer } from '../../business/viewer.model';
import {
  CreatePurchaseRequestDto,
  InboxQueryDto,
  LeaderDecisionDto,
  LeaderInboxQueryDto,
  SufficiencyDecisionDto,
} from './purchase-request.dto';
import { PurchaseRequestExceptionFilter } from './domain-exception.filter';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { CurrentViewer, RequireRole, RolesGuard } from './guards/roles.guard';

const toInboxFilters = (query: LeaderInboxQueryDto): InboxFilters => {
  const search = query.search?.trim();
  return {
    status: query.status,
    statusGroup: query.statusGroup,
    search: search ? search : undefined,
    leaderStatus: query.leaderStatus,
    page: query.page ?? 1,
    limit: query.limit ?? 10,
  };
};

// Una ruta por sección del front, cada una con su rol (docs/BUSINESS_RULES.md, sección 6).
// El usuario siempre sale del token; el cliente no manda nada que amplíe lo que ve.
@Controller('api/v1/purchase-requests')
@UseGuards(ClerkAuthGuard, RolesGuard)
@UseFilters(PurchaseRequestExceptionFilter)
export class PurchaseRequestController {
  constructor(private readonly purchaseRequestLogic: PurchaseRequestLogicI) {}

  // ==========================================
  // Solicitante: las que creó
  // ==========================================

  @Get('mine')
  @RequireRole(ROLE.SOLICITANTE)
  @HttpCode(HttpStatus.OK)
  async listMine(
    @CurrentViewer() viewer: Viewer,
    @Query() query: InboxQueryDto,
  ): Promise<PaginatedPurchaseRequests> {
    return await this.purchaseRequestLogic.listInbox(
      'mine',
      viewer.userId,
      toInboxFilters(query),
    );
  }

  // Antes de 'mine/:id': si no, 'summary' se interpretaría como id.
  @Get('mine/summary')
  @RequireRole(ROLE.SOLICITANTE)
  @HttpCode(HttpStatus.OK)
  async summaryMine(@CurrentViewer() viewer: Viewer): Promise<InboxSummary> {
    return await this.purchaseRequestLogic.getInboxSummary(
      'mine',
      viewer.userId,
    );
  }

  @Get('mine/:id')
  @RequireRole(ROLE.SOLICITANTE)
  @HttpCode(HttpStatus.OK)
  async getMine(
    @CurrentViewer() viewer: Viewer,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<PurchaseRequestView> {
    return await this.purchaseRequestLogic.getInboxItem(
      'mine',
      viewer.userId,
      id,
    );
  }

  // ==========================================
  // Líder de actividad: las que tienen filas suyas (solo ve sus filas)
  // ==========================================

  @Get('leader')
  @RequireRole(ROLE.LIDER_ACTIVIDAD)
  @HttpCode(HttpStatus.OK)
  async listLeader(
    @CurrentViewer() viewer: Viewer,
    @Query() query: LeaderInboxQueryDto,
  ): Promise<PaginatedPurchaseRequests> {
    return await this.purchaseRequestLogic.listInbox(
      'leader',
      viewer.userId,
      toInboxFilters(query),
    );
  }

  // Antes de 'leader/:id': si no, 'summary' se interpretaría como id.
  @Get('leader/summary')
  @RequireRole(ROLE.LIDER_ACTIVIDAD)
  @HttpCode(HttpStatus.OK)
  async summaryLeader(@CurrentViewer() viewer: Viewer): Promise<InboxSummary> {
    return await this.purchaseRequestLogic.getInboxSummary(
      'leader',
      viewer.userId,
    );
  }

  @Get('leader/:id')
  @RequireRole(ROLE.LIDER_ACTIVIDAD)
  @HttpCode(HttpStatus.OK)
  async getLeader(
    @CurrentViewer() viewer: Viewer,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<PurchaseRequestView> {
    return await this.purchaseRequestLogic.getInboxItem(
      'leader',
      viewer.userId,
      id,
    );
  }

  // El líder aprueba o rechaza una de sus filas. Si rechaza, la solicitud completa
  // pasa a RECHAZA_LIDER; cuando todas las filas están aprobadas, a APRUEBA_LIDER.
  @Post('leader/:id/rows/:rowId/decision')
  @RequireRole(ROLE.LIDER_ACTIVIDAD)
  @HttpCode(HttpStatus.OK)
  async decideAsLeader(
    @CurrentViewer() viewer: Viewer,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('rowId', new ParseUUIDPipe()) rowId: string,
    @Body() dto: LeaderDecisionDto,
  ): Promise<PurchaseRequestView> {
    return await this.purchaseRequestLogic.decideAsLeader({
      purchaseRequestId: id,
      requestComponentId: rowId,
      leaderId: viewer.userId,
      decision: dto.decision,
      justification: dto.justification,
    });
  }

  // ==========================================
  // Suficiencia presupuestal: desde APRUEBA_LIDER
  // ==========================================

  @Get('sufficiency')
  @RequireRole(ROLE.SUFICIENCIA_PRESUPUESTAL)
  @HttpCode(HttpStatus.OK)
  async listSufficiency(
    @CurrentViewer() viewer: Viewer,
    @Query() query: InboxQueryDto,
  ): Promise<PaginatedPurchaseRequests> {
    return await this.purchaseRequestLogic.listInbox(
      'sufficiency',
      viewer.userId,
      toInboxFilters(query),
    );
  }

  // Antes de 'sufficiency/:id': si no, 'summary' se interpretaría como id.
  @Get('sufficiency/summary')
  @RequireRole(ROLE.SUFICIENCIA_PRESUPUESTAL)
  @HttpCode(HttpStatus.OK)
  async summarySufficiency(
    @CurrentViewer() viewer: Viewer,
  ): Promise<InboxSummary> {
    return await this.purchaseRequestLogic.getInboxSummary(
      'sufficiency',
      viewer.userId,
    );
  }

  @Get('sufficiency/:id')
  @RequireRole(ROLE.SUFICIENCIA_PRESUPUESTAL)
  @HttpCode(HttpStatus.OK)
  async getSufficiency(
    @CurrentViewer() viewer: Viewer,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<PurchaseRequestView> {
    return await this.purchaseRequestLogic.getInboxItem(
      'sufficiency',
      viewer.userId,
      id,
    );
  }

  // Primera revisión, con el monto estimado: solo aplica en APRUEBA_LIDER.
  @Post('sufficiency/:id/decision')
  @RequireRole(ROLE.SUFICIENCIA_PRESUPUESTAL)
  @HttpCode(HttpStatus.OK)
  async decideAsSufficiency(
    @CurrentViewer() viewer: Viewer,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SufficiencyDecisionDto,
  ): Promise<PurchaseRequestView> {
    return await this.purchaseRequestLogic.decideAsSufficiency({
      purchaseRequestId: id,
      userId: viewer.userId,
      decision: dto.decision,
      justification: dto.justification,
    });
  }

  // ==========================================
  // Recursos materiales: desde AUTORIZA_SUFICIENCIA
  // ==========================================

  @Get('resources')
  @RequireRole(ROLE.RECURSOS_MATERIALES)
  @HttpCode(HttpStatus.OK)
  async listResources(
    @CurrentViewer() viewer: Viewer,
    @Query() query: InboxQueryDto,
  ): Promise<PaginatedPurchaseRequests> {
    return await this.purchaseRequestLogic.listInbox(
      'resources',
      viewer.userId,
      toInboxFilters(query),
    );
  }

  // Antes de 'resources/:id': si no, 'summary' se interpretaría como id.
  @Get('resources/summary')
  @RequireRole(ROLE.RECURSOS_MATERIALES)
  @HttpCode(HttpStatus.OK)
  async summaryResources(
    @CurrentViewer() viewer: Viewer,
  ): Promise<InboxSummary> {
    return await this.purchaseRequestLogic.getInboxSummary(
      'resources',
      viewer.userId,
    );
  }

  @Get('resources/:id')
  @RequireRole(ROLE.RECURSOS_MATERIALES)
  @HttpCode(HttpStatus.OK)
  async getResources(
    @CurrentViewer() viewer: Viewer,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<PurchaseRequestView> {
    return await this.purchaseRequestLogic.getInboxItem(
      'resources',
      viewer.userId,
      id,
    );
  }

  // ==========================================
  // Crear: el solicitante sale del token, nunca del body
  // ==========================================

  @Post()
  @RequireRole(ROLE.SOLICITANTE)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentViewer() viewer: Viewer,
    @Body() dto: CreatePurchaseRequestDto,
  ): Promise<{ id: string }> {
    const components = (dto.requestComponents ?? []).map((c) =>
      RequestComponent.create({
        componentId: c.componentId,
        activityId: c.activityId,
        fundingSourceId: c.fundingSourceId,
        estimatedAmount: c.estimatedAmount,
      }),
    );

    const items = (dto.productItems ?? []).map((i) =>
      ProductItem.create({
        budgetItemId: i.budgetItemId,
        measurementUnitId: i.measurementUnitId,
        quantity: i.quantity,
        description: i.description,
        estimatedAmount: i.estimatedAmount,
      }),
    );

    const request = PurchaseRequest.create({
      requestedBy: viewer.userId,
      justification: dto.justification,
      isoIds: dto.isoIds,
      requestComponents: components,
      productItems: items,
    });

    const id = await this.purchaseRequestLogic.create(request);

    return { id };
  }
}
