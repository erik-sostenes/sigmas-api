import { Injectable } from '@nestjs/common';
import {
  PurchaseRequest,
  PurchaseRequestID,
  type RequestStatus,
} from './purchase-request.model';
import {
  type Inbox,
  type InboxFilters,
  type InboxSummary,
  type InboxVisibility,
  type LeaderDecisionInput,
  type PaginatedPurchaseRequests,
  type PurchaseRequestView,
  type SufficiencyDecisionInput,
  PurchaseRequestLogicI,
  PurchaseRequestRepositoryI,
} from './purchase-request.ports';
import { PurchaseRequestNotFoundError } from './purchase-request.errors';
import { INBOX_STAGES } from './purchase-request.stages';

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
      statusGroup: filters.statusGroup
        ? INBOX_STAGES[inbox][filters.statusGroup]
        : undefined,
      stages: INBOX_STAGES[inbox],
      viewerId,
      visibility: INBOX_VISIBILITY[inbox],
    });
  }

  async getInboxSummary(inbox: Inbox, viewerId: string): Promise<InboxSummary> {
    return await this.purchaseRequestRepository.summarizeInbox({
      viewerId,
      visibility: INBOX_VISIBILITY[inbox],
      groups: INBOX_STAGES[inbox],
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
      stages: INBOX_STAGES[inbox],
    });

    if (!item) {
      throw new PurchaseRequestNotFoundError(id);
    }

    return item;
  }

  // Regresa la solicitud tal como la ve el líder después de decidir.
  async decideAsLeader(
    input: LeaderDecisionInput,
  ): Promise<PurchaseRequestView> {
    const found = await this.purchaseRequestRepository.updateWithLock(
      input.purchaseRequestId,
      (request) => {
        const statusBefore = request.status;
        request.decideAsLeader(
          input.requestComponentId,
          input.leaderId,
          input.decision,
          input.justification,
        );
        return {
          requestComponentId: input.requestComponentId,
          statusBefore,
          statusAfter: request.status !== statusBefore ? request.status : null,
          decision: input.decision,
          userId: input.leaderId,
          justification: input.justification,
        };
      },
    );

    if (!found) {
      throw new PurchaseRequestNotFoundError(input.purchaseRequestId);
    }

    return await this.getInboxItem(
      'leader',
      input.leaderId,
      input.purchaseRequestId,
    );
  }

  // Primera revisión de suficiencia, con el monto estimado.
  async decideAsSufficiency(
    input: SufficiencyDecisionInput,
  ): Promise<PurchaseRequestView> {
    const found = await this.purchaseRequestRepository.updateWithLock(
      input.purchaseRequestId,
      (request) => {
        // Lo que suficiencia todavía no ve responde igual que si no existiera.
        if (!SUFFICIENCY_VISIBLE_STATUSES.includes(request.status)) {
          throw new PurchaseRequestNotFoundError(input.purchaseRequestId);
        }

        const statusBefore = request.status;
        if (input.decision === 'AUTORIZA') {
          request.authorizeBySufficiency();
        } else {
          request.rejectBySufficiency(input.justification);
        }
        return {
          statusBefore,
          statusAfter: request.status,
          decision: input.decision === 'AUTORIZA' ? 'APROBADO' : 'RECHAZADO',
          userId: input.userId,
          justification: input.justification,
        };
      },
    );

    if (!found) {
      throw new PurchaseRequestNotFoundError(input.purchaseRequestId);
    }

    return await this.getInboxItem(
      'sufficiency',
      input.userId,
      input.purchaseRequestId,
    );
  }
}
