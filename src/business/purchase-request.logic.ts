import { Injectable } from '@nestjs/common';
import { PurchaseRequest, PurchaseRequestID } from './purchase-request.model';
import {
  type ListPurchaseRequestsInput,
  type PaginatedPurchaseRequests,
  PurchaseRequestLogicI,
  PurchaseRequestRepositoryI,
} from './purchase-request.ports';
import { PurchaseRequestAccessDeniedError } from './purchase-request.errors';

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
    if (
      input.clerkMetadataRole &&
      ADMIN_ROLE_CODES.has(input.clerkMetadataRole)
    ) {
      throw new PurchaseRequestAccessDeniedError(
        'El administrador no tiene permiso para consultar solicitudes de compra.',
      );
    }

    const viewer = await this.purchaseRequestRepository.findViewerByClerkId(
      input.clerkId,
    );

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
      input.scope === 'all' &&
      !viewer.roleCodes.some((code) => ALL_SCOPE_ROLE_CODES.has(code))
    ) {
      throw new PurchaseRequestAccessDeniedError(
        'No tienes permiso para consultar todas las solicitudes de compra.',
      );
    }

    return await this.purchaseRequestRepository.listPaginated({
      userId: viewer.userId,
      scope: input.scope,
      status: input.status,
      page: input.page,
      limit: input.limit,
    });
  }
}
