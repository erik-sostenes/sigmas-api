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
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  type PaginatedPurchaseRequests,
  type PurchaseRequestListItem,
  PurchaseRequestLogicI,
} from '../../business/purchase-request.ports';
import { PurchaseRequest } from '../../business/purchase-request.model';
import { RequestComponent } from '../../business/request-component.model';
import { ProductItem } from '../../business/product-item.model';
import {
  CreatePurchaseRequestDto,
  GetPurchaseRequestByIdQueryDto,
  ListPurchaseRequestsQueryDto,
} from './purchase-request.dto';
import { PurchaseRequestExceptionFilter } from './domain-exception.filter';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import {
  CurrentViewer,
  RequireRole,
  RolesGuard,
} from './guards/roles.guard';
import { ROLE } from '../../business/role-codes';
import type { Viewer } from '../../business/viewer.model';

type AuthenticatedRequest = {
  auth: {
    userId: string;
    sessionClaims?: {
      metadata?: {
        rol?: string;
        role?: string;
      };
    };
  };
};

@Controller('api/v1/purchase-requests')
@UseGuards(ClerkAuthGuard)
@UseFilters(PurchaseRequestExceptionFilter)
export class PurchaseRequestController {
  constructor(private readonly purchaseRequestLogic: PurchaseRequestLogicI) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(
    @Req() req: AuthenticatedRequest,
    @Query() query: ListPurchaseRequestsQueryDto,
  ): Promise<PaginatedPurchaseRequests> {
    const metadata = req.auth?.sessionClaims?.metadata;
    const clerkMetadataRole = metadata?.rol ?? metadata?.role;
    const trimmedSearch = query.search?.trim();

    return await this.purchaseRequestLogic.list({
      clerkId: req.auth.userId,
      clerkMetadataRole,
      scope: query.scope,
      status: query.status,
      search: trimmedSearch && trimmedSearch.length > 0 ? trimmedSearch : undefined,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getById(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: GetPurchaseRequestByIdQueryDto,
  ): Promise<PurchaseRequestListItem> {
    const metadata = req.auth?.sessionClaims?.metadata;
    const clerkMetadataRole = metadata?.rol ?? metadata?.role;

    return await this.purchaseRequestLogic.getById({
      id,
      clerkId: req.auth.userId,
      clerkMetadataRole,
      scope: query.scope,
    });
  }

  // El solicitante sale del token, nunca del body.
  @Post()
  @UseGuards(RolesGuard)
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
