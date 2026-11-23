import {
  PurchaseRequest,
  PurchaseRequestID,
  type PurchaseType,
  type RequestStatus,
} from './purchase-request.model';
import type { ComponentLeaderStatus } from './request-component.model';

// ==========================================
// Bandejas: una por sección del front (docs/BUSINESS_RULES.md, sección 6)
// ==========================================

export const INBOXES = ['mine', 'leader', 'sufficiency', 'resources'] as const;
export type Inbox = (typeof INBOXES)[number];

// Qué solicitudes entran a una bandeja. El repositorio solo traduce esto a SQL.
// - requester: las que creó el usuario
// - leader: las que tienen al menos una fila suya; solo se regresan sus filas
// - statuses: todas las que están en esos estados (áreas que ven todo)
export type InboxVisibility =
  | { kind: 'requester' }
  | { kind: 'leader' }
  | { kind: 'statuses'; statuses: readonly RequestStatus[] };

export interface CatalogRef {
  id: number;
  code: string;
  name: string;
}

export interface PurchaseRequestRequesterView {
  id: string;
  title: string | null;
  firstName: string;
  lastName: string;
  email: string;
  department: { id: number; name: string };
}

export interface PurchaseRequestLeaderView {
  id: string;
  title: string | null;
  firstName: string;
  lastName: string;
}

export interface PurchaseRequestComponentView {
  id: string;
  component: CatalogRef;
  activity: CatalogRef;
  administrativeUnit: CatalogRef;
  fundingSource: CatalogRef;
  estimatedAmount: number;
  finalAmount: number;
  leader: PurchaseRequestLeaderView;
  leaderStatus: ComponentLeaderStatus;
  leaderDecidedAt: Date | null;
}

export interface PurchaseRequestProductItemView {
  id: string;
  budgetItem: CatalogRef;
  measurementUnit: { id: number; name: string };
  quantity: number;
  description: string;
  estimatedAmount: number;
  finalAmount: number;
}

export interface PurchaseRequestView {
  id: PurchaseRequestID;
  requestNumber: number;
  status: RequestStatus;
  purchaseType: PurchaseType | null;
  justification: string;
  totalAmountEstimated: number;
  totalAmountFinal: number;
  requester: PurchaseRequestRequesterView;
  isos: { id: number; name: string }[];
  components: PurchaseRequestComponentView[];
  productItems: PurchaseRequestProductItemView[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedPurchaseRequests {
  data: PurchaseRequestView[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Filtros que manda el front. Solo reducen lo que la bandeja ya permite ver.
export interface InboxFilters {
  status?: RequestStatus;
  search?: string;
  // Solo bandeja del líder: estado de sus filas
  leaderStatus?: ComponentLeaderStatus;
  page: number;
  limit: number;
}

export interface ListInboxRepoQuery extends InboxFilters {
  viewerId: string;
  visibility: InboxVisibility;
}

export interface FindInboxItemRepoQuery {
  id: PurchaseRequestID;
  viewerId: string;
  visibility: InboxVisibility;
}

// ==========================================
// Decisiones
// ==========================================

export type LeaderDecision = Exclude<ComponentLeaderStatus, 'PENDIENTE'>;

export const SUFFICIENCY_DECISIONS = ['AUTORIZA', 'RECHAZA'] as const;
export type SufficiencyDecision = (typeof SUFFICIENCY_DECISIONS)[number];

export interface LeaderDecisionInput {
  purchaseRequestId: PurchaseRequestID;
  requestComponentId: string;
  leaderId: string;
  decision: LeaderDecision;
  justification?: string;
}

export interface SufficiencyDecisionInput {
  purchaseRequestId: PurchaseRequestID;
  userId: string;
  decision: SufficiencyDecision;
  justification?: string;
}

// Registro de purchase_request_history. Nunca se borra.
export interface HistoryEntry {
  requestComponentId?: string;
  statusBefore: RequestStatus;
  // null si la decisión no cambió el estado de la solicitud
  statusAfter: RequestStatus | null;
  decision: LeaderDecision;
  userId: string;
  justification?: string;
}

// left ports
export abstract class PurchaseRequestLogicI {
  abstract create(request: PurchaseRequest): Promise<PurchaseRequestID>;
  abstract listInbox(
    inbox: Inbox,
    viewerId: string,
    filters: InboxFilters,
  ): Promise<PaginatedPurchaseRequests>;
  abstract getInboxItem(
    inbox: Inbox,
    viewerId: string,
    id: PurchaseRequestID,
  ): Promise<PurchaseRequestView>;
  abstract decideAsLeader(
    input: LeaderDecisionInput,
  ): Promise<PurchaseRequestView>;
  abstract decideAsSufficiency(
    input: SufficiencyDecisionInput,
  ): Promise<PurchaseRequestView>;
}

// right ports
export abstract class PurchaseRequestRepositoryI {
  abstract save(request: PurchaseRequest): Promise<PurchaseRequestID>;
  abstract listInbox(
    query: ListInboxRepoQuery,
  ): Promise<PaginatedPurchaseRequests>;
  abstract findInboxItem(
    query: FindInboxItemRepoQuery,
  ): Promise<PurchaseRequestView | null>;
  // Carga la solicitud con sus filas bloqueadas (FOR UPDATE), aplica `change` y guarda
  // estado, decisiones de las filas y el registro de historial en una sola transacción.
  // Regresa false si la solicitud no existe. Si `change` lanza, no se guarda nada.
  abstract updateWithLock(
    id: PurchaseRequestID,
    change: (request: PurchaseRequest) => HistoryEntry,
  ): Promise<boolean>;
}
