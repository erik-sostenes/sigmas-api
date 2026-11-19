import { Injectable } from '@nestjs/common';
import { PurchaseRequest, PurchaseRequestID } from './purchase-request.model';
import {
  type GetPurchaseRequestByIdInput,
  type ListPurchaseRequestsInput,
  type PaginatedPurchaseRequests,
  type PurchaseRequestListItem,
  PurchaseRequestLogicI,
  PurchaseRequestRepositoryI,
  type PurchaseRequestScope,
  type PurchaseRequestViewer,
} from './purchase-request.ports';
import {
  PurchaseRequestAccessDeniedError,
  PurchaseRequestNotFoundError,
} from './purchase-request.errors';

const ADMIN_ROLE_CODES = new Set(['super_admin', 'admin']);
const ALL_SCOPE_ROLE_CODES = new Set([
  'suficiencia_presupuestal',
  'recursos_materiales',
  'servicios_administrativos',
]);

@Injectable()
export class PurchaseRequestLogic implements PurchaseRequestLogicI {
  constructor(
    private readonly purchaseRequestRepository: PurchaseRequestRepositoryI,
  ) {}

  async create(request: PurchaseRequest): Promise<PurchaseRequestID> {
    const id = await this.purchaseRequestRepository.save(request);

    return id;
  }

  async list(
    input: ListPurchaseRequestsInput,
  ): Promise<PaginatedPurchaseRequests> {
    const viewer = await this.resolveAuthorizedViewer(
      input.clerkId,
      input.clerkMetadataRole,
      input.scope,
    );

    return await this.purchaseRequestRepository.listPaginated({
      userId: viewer.userId,
      scope: input.scope,
      status: input.status,
      search: input.search,
      page: input.page,
      limit: input.limit,
    });
  }

  async getById(
    input: GetPurchaseRequestByIdInput,
  ): Promise<PurchaseRequestListItem> {
    const viewer = await this.resolveAuthorizedViewer(
      input.clerkId,
      input.clerkMetadataRole,
      input.scope,
    );

    const detail = await this.purchaseRequestRepository.findDetailById({
      id: input.id,
      userId: viewer.userId,
      scope: input.scope,
    });

    if (detail) {
      return detail;
    }

    const exists = await this.purchaseRequestRepository.existsById(input.id);
    if (!exists) {
      throw new PurchaseRequestNotFoundError(input.id);
    }

    throw new PurchaseRequestAccessDeniedError(
      'No tienes permiso para consultar esta solicitud de compra.',
    );
  }

  private async resolveAuthorizedViewer(
    clerkId: string,
    clerkMetadataRole?: string,
    scope?: PurchaseRequestScope,
  ): Promise<PurchaseRequestViewer> {
    if (clerkMetadataRole && ADMIN_ROLE_CODES.has(clerkMetadataRole)) {
      throw new PurchaseRequestAccessDeniedError(
        'El administrador no tiene permiso para consultar solicitudes de compra.',
      );
    }

    const viewer =
      await this.purchaseRequestRepository.findViewerByClerkId(clerkId);

    if (!viewer) {
      throw new PurchaseRequestAccessDeniedError(
        'Usuario no registrado o inactivo en el sistema.',
      );
    }

    if (viewer.roleCodes.some((code) => ADMIN_ROLE_CODES.has(code))) {
      throw new PurchaseRequestAccessDeniedError(
        'El administrador no tiene permiso para consultar solicitudes de compra.',
      );
    }

    if (
      scope === 'all' &&
      !viewer.roleCodes.some((code) => ALL_SCOPE_ROLE_CODES.has(code))
    ) {
      throw new PurchaseRequestAccessDeniedError(
        'No tienes permiso para consultar todas las solicitudes.',
      );
    }

    return viewer;
  }
}
