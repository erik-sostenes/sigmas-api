import { Injectable } from '@nestjs/common';
import {
  PurchaseRequest,
  PurchaseRequestID,
  type RequestStatus,
} from './purchase-request.model';
import {
  type Inbox,
  type InboxFilters,
  type InboxVisibility,
  type PaginatedPurchaseRequests,
  type PurchaseRequestView,
  PurchaseRequestLogicI,
  PurchaseRequestRepositoryI,
} from './purchase-request.ports';
import { PurchaseRequestNotFoundError } from './purchase-request.errors';

// Cada área ve las solicitudes desde que le llegan y las conserva como histórico.
// Las rechazadas antes de llegarle no las ve (docs/BUSINESS_RULES.md, sección 6).
const SUFFICIENCY_VISIBLE_STATUSES: readonly RequestStatus[] = [
  'APRUEBA_LIDER',
  'AUTORIZA_SUFICIENCIA',
  'RECHAZA_SUFICIENCIA',
  'EN_REVISION_RECURSOS',
  'PENDIENTE_APROBACION_SUFICIENCIA',
  'APRUEBA_SUFICIENCIA',
  'RECHAZA_SUFICIENCIA_FINAL',
  'APRUEBA_REVISION',
  'RECHAZA_REVISION',
  'AUTORIZA_DIRECCION',
  'RECHAZA_DIRECCION',
  'APRUEBA_FISCAL',
  'RECHAZA_FISCAL',
];

const RESOURCES_VISIBLE_STATUSES: readonly RequestStatus[] = [
  'AUTORIZA_SUFICIENCIA',
  'EN_REVISION_RECURSOS',
  'PENDIENTE_APROBACION_SUFICIENCIA',
  'APRUEBA_SUFICIENCIA',
  'RECHAZA_SUFICIENCIA_FINAL',
  'APRUEBA_REVISION',
  'RECHAZA_REVISION',
  'AUTORIZA_DIRECCION',
  'RECHAZA_DIRECCION',
  'APRUEBA_FISCAL',
  'RECHAZA_FISCAL',
];

const INBOX_VISIBILITY: Record<Inbox, InboxVisibility> = {
  mine: { kind: 'requester' },
  leader: { kind: 'leader' },
  sufficiency: { kind: 'statuses', statuses: SUFFICIENCY_VISIBLE_STATUSES },
  resources: { kind: 'statuses', statuses: RESOURCES_VISIBLE_STATUSES },
};

@Injectable()
export class PurchaseRequestLogic implements PurchaseRequestLogicI {
  constructor(
    private readonly purchaseRequestRepository: PurchaseRequestRepositoryI,
  ) {}

  async create(request: PurchaseRequest): Promise<PurchaseRequestID> {
    const id = await this.purchaseRequestRepository.save(request);

    return id;
  }

  async listInbox(
    inbox: Inbox,
    viewerId: string,
    filters: InboxFilters,
  ): Promise<PaginatedPurchaseRequests> {
    return await this.purchaseRequestRepository.listInbox({
      ...filters,
      // leaderStatus solo aplica a la bandeja del líder
      leaderStatus: inbox === 'leader' ? filters.leaderStatus : undefined,
      viewerId,
      visibility: INBOX_VISIBILITY[inbox],
    });
  }

  // 404 tanto si no existe como si no entra en la bandeja: no se revela que existe.
  async getInboxItem(
    inbox: Inbox,
    viewerId: string,
    id: PurchaseRequestID,
  ): Promise<PurchaseRequestView> {
    const item = await this.purchaseRequestRepository.findInboxItem({
      id,
      viewerId,
      visibility: INBOX_VISIBILITY[inbox],
    });

    if (!item) {
      throw new PurchaseRequestNotFoundError(id);
    }

    return item;
  }
}
