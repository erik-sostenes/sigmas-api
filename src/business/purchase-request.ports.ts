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

export interface PurchaseRequestUserView {
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
  leader: PurchaseRequestUserView;
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

// Una decisión registrada (aprobación o rechazo). Lo ven todas las bandejas.
export interface PurchaseRequestHistoryView {
  id: string;
  decision: 'APROBADO' | 'RECHAZADO';
  statusBefore: RequestStatus;
  // null si la decisión no cambió el estado (p. ej. un líder aprueba y faltan otros)
  statusAfter: RequestStatus | null;
  justification: string | null;
  user: PurchaseRequestUserView;
  // Solo en capturas de firmas físicas (etapas futuras)
  signerName: string | null;
  // Solo en decisiones de líder: la fila y su actividad (sin importes)
  requestComponentId: string | null;
  activity: CatalogRef | null;
  createdAt: Date;
}

export interface ComparativeChartSummaryView {
  id: string;
  highestScore: number;
  totalAmount: number;
  awardedProviderName: string;
  updatedAt: Date;
}

export interface PurchaseRequestView {
  id: PurchaseRequestID;
  parentRequestId: string | null;
  requestNumber: number;
  segmentNumber: number;
  folio: string;
  status: RequestStatus;
  // Etapa según la bandeja que consulta: "por_validar" es lo que le toca a ese usuario.
  statusGroup: StatusGroup;
  purchaseType: PurchaseType | null;
  awardedProvider: { id: number; rfc: string; name: string } | null;
  justification: string;
  totalAmountEstimated: number;
  finalSubtotal: number;
  finalIva: number;
  finalRetentionIva: number;
  finalRetentionIsr: number;
  totalAmountFinal: number;
  comparativeChart: ComparativeChartSummaryView | null;
  requester: PurchaseRequestRequesterView;
  isos: { id: number; name: string }[];
  components: PurchaseRequestComponentView[];
  productItems: PurchaseRequestProductItemView[];
  // De la más antigua a la más reciente
  history: PurchaseRequestHistoryView[];
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

// Etapas que ve el usuario (pestañas). Qué estados entran en cada una lo define
// la lógica de negocio por bandeja (INBOX_STAGES en purchase-request.stages.ts), no el front.
export const STATUS_GROUPS = [
  'por_validar',
  'en_proceso',
  'aprobadas',
  'rechazadas',
] as const;
export type StatusGroup = (typeof STATUS_GROUPS)[number];

// Cómo se arma un grupo: estados, más (opcional) las solicitudes en SOLICITADO según
// si algún líder ya decidió alguna fila, o si a quien consulta le queda una fila suya pendiente.
export interface StatusGroupCondition {
  statuses: readonly RequestStatus[];
  solicitado?:
    | 'sin_decisiones'
    | 'con_decisiones'
    | 'fila_propia_pendiente'
    | 'sin_fila_propia_pendiente';
}

// Filtros que manda el front. Solo reducen lo que la bandeja ya permite ver.
export interface InboxFilters {
  status?: RequestStatus;
  statusGroup?: StatusGroup;
  search?: string;
  // Solo bandeja del líder: estado de sus filas
  leaderStatus?: ComponentLeaderStatus;
  // Solo bandeja de Recursos Materiales: sin clasificar o filtrado por modalidades
  unclassified?: boolean;
  purchaseTypes?: PurchaseType[];
  page: number;
  limit: number;
}

export interface ListInboxRepoQuery extends Omit<InboxFilters, 'statusGroup'> {
  viewerId: string;
  visibility: InboxVisibility;
  // Etapas de la bandeja: para calcular statusGroup de cada solicitud.
  stages: Record<StatusGroup, StatusGroupCondition>;
  statusGroup?: StatusGroupCondition;
}

// Cuántas solicitudes hay en la bandeja y en cada etapa (para las pestañas).
export interface InboxSummary {
  total: number;
  byGroup: Record<StatusGroup, number>;
}

export interface SummarizeInboxRepoQuery {
  viewerId: string;
  visibility: InboxVisibility;
  groups: Record<StatusGroup, StatusGroupCondition>;
}

export interface FindInboxItemRepoQuery {
  id: PurchaseRequestID;
  viewerId: string;
  visibility: InboxVisibility;
  stages: Record<StatusGroup, StatusGroupCondition>;
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

export interface AssignPurchaseTypeInput {
  purchaseRequestId: PurchaseRequestID;
  userId: string;
  purchaseType: PurchaseType;
}

export interface SegmentAllocationInput {
  requestComponentId: string;
  originalEstimatedAmount: number;
  derivedEstimatedAmount: number;
}

export interface SegmentRequestInput {
  purchaseRequestId: PurchaseRequestID;
  userId: string;
  productItemIds: string[];
  componentAllocations?: SegmentAllocationInput[];
}

export interface SegmentRequestResult {
  original: PurchaseRequestView;
  derived: PurchaseRequestView;
}

export interface SaveCounterPurchaseInput {
  purchaseRequestId: PurchaseRequestID;
  userId: string;
  awardedProviderId: number;
  totalAmountFinal: number;
}

export interface ComponentFinalAmountInput {
  requestComponentId: string;
  finalAmount: number;
}

export interface SendToSufficiencyInput {
  purchaseRequestId: PurchaseRequestID;
  userId: string;
  componentFinalAmounts?: ComponentFinalAmountInput[];
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
  abstract getInboxSummary(
    inbox: Inbox,
    viewerId: string,
  ): Promise<InboxSummary>;
  abstract decideAsLeader(
    input: LeaderDecisionInput,
  ): Promise<PurchaseRequestView>;
  abstract decideAsSufficiency(
    input: SufficiencyDecisionInput,
  ): Promise<PurchaseRequestView>;
  abstract assignPurchaseType(
    input: AssignPurchaseTypeInput,
  ): Promise<PurchaseRequestView>;
  abstract segmentRequest(
    input: SegmentRequestInput,
  ): Promise<SegmentRequestResult>;
  abstract saveCounterPurchase(
    input: SaveCounterPurchaseInput,
  ): Promise<PurchaseRequestView>;
  abstract sendToSufficiency(
    input: SendToSufficiencyInput,
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
  abstract summarizeInbox(
    query: SummarizeInboxRepoQuery,
  ): Promise<InboxSummary>;
  // Carga la solicitud con sus filas bloqueadas (FOR UPDATE), aplica `change` y guarda
  // estado, decisiones de las filas y el registro de historial en una sola transacción.
  // Regresa false si la solicitud no existe. Si `change` lanza, no se guarda nada.
  abstract updateWithLock(
    id: PurchaseRequestID,
    change: (request: PurchaseRequest) => HistoryEntry,
  ): Promise<boolean>;
  abstract assignPurchaseTypeWithLock(
    input: AssignPurchaseTypeInput,
  ): Promise<boolean>;
  abstract segmentWithLock(
    input: SegmentRequestInput,
  ): Promise<{ derivedId: PurchaseRequestID } | null>;
  abstract saveCounterPurchaseWithLock(
    input: SaveCounterPurchaseInput,
  ): Promise<boolean>;
  abstract sendToSufficiencyWithLock(
    input: SendToSufficiencyInput,
  ): Promise<boolean>;
}
