import type { Provider } from './provider.model';
import type { PurchaseType, RequestStatus } from './purchase-request.model';
import type {
  InboxSummary,
  PurchaseRequestRequesterView,
  PurchaseRequestView,
  StatusGroup,
  StatusGroupCondition,
} from './purchase-request.ports';
import type {
  ChartColumnInput,
  EvaluationCriterion,
} from './comparative-chart.model';

export interface ComparativeChartSummaryItem {
  id: string;
  purchaseRequestId: string;
  requestNumber: number;
  segmentNumber: number;
  folio: string;
  purchaseType: PurchaseType;
  requestStatus: RequestStatus;
  statusGroup: StatusGroup;
  highestScore: number;
  totalAmount: number;
  awardedProviderName: string;
  requester: PurchaseRequestRequesterView;
  chartDate: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedComparativeCharts {
  data: ComparativeChartSummaryItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: InboxSummary;
}

export interface ComparativeChartColumnView {
  id: string;
  position: 1 | 2 | 3;
  provider: Provider;
  subtotal: number;
  iva: number;
  retentionIva: number;
  retentionIsr: number;
  total: number;
  totalScore: number;
  items: {
    productItemId: string;
    unitCost: number | null;
    totalCost: number | null;
  }[];
  evaluations: {
    criterion: EvaluationCriterion;
    score: number;
    observation: string;
  }[];
}

export interface ComparativeChartDetailView {
  id: string;
  purchaseRequestId: string;
  chartDate: string;
  awardedProviderId: number;
  highestScore: number;
  awardedJustification: string | null;
  deliveryDate: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  request: PurchaseRequestView;
  columns: ComparativeChartColumnView[];
}

export interface ListComparativeChartsQuery {
  status?: RequestStatus;
  statusGroup?: StatusGroup;
  search?: string;
  page: number;
  limit: number;
}

export interface ListComparativeChartsRepoQuery {
  status?: RequestStatus;
  statusGroup?: StatusGroupCondition;
  search?: string;
  page: number;
  limit: number;
  stages: Record<StatusGroup, StatusGroupCondition>;
}

export interface SaveComparativeChartInput {
  purchaseRequestId: string;
  chartDate?: string;
  awardedJustification?: string | null;
  deliveryDate?: string | null;
  columns: ChartColumnInput[];
}

export interface UpdateComparativeChartInput {
  chartDate?: string;
  awardedJustification?: string | null;
  deliveryDate?: string | null;
  columns: ChartColumnInput[];
}

export abstract class ComparativeChartLogicI {
  abstract list(
    query: ListComparativeChartsQuery,
  ): Promise<PaginatedComparativeCharts>;
  abstract getById(
    id: string,
    viewerId: string,
  ): Promise<ComparativeChartDetailView>;
  abstract create(
    viewerId: string,
    input: SaveComparativeChartInput,
  ): Promise<ComparativeChartDetailView>;
  abstract update(
    id: string,
    viewerId: string,
    input: UpdateComparativeChartInput,
  ): Promise<ComparativeChartDetailView>;
  abstract delete(id: string): Promise<void>;
}

export abstract class ComparativeChartRepositoryI {
  abstract list(
    query: ListComparativeChartsRepoQuery,
  ): Promise<PaginatedComparativeCharts>;
  abstract findById(
    id: string,
    viewerId: string,
  ): Promise<ComparativeChartDetailView | null>;
  abstract createWithLock(
    viewerId: string,
    input: SaveComparativeChartInput,
  ): Promise<string>;
  abstract updateWithLock(
    id: string,
    viewerId: string,
    input: UpdateComparativeChartInput,
  ): Promise<void>;
  abstract deleteWithLock(id: string): Promise<void>;
}
