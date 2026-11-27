import { Injectable } from '@nestjs/common';
import { INBOX_STAGES } from './purchase-request.stages';
import { ComparativeChartNotFoundError } from './comparative-chart.errors';
import {
  ComparativeChartLogicI,
  ComparativeChartRepositoryI,
  type ComparativeChartDetailView,
  type ListComparativeChartsQuery,
  type PaginatedComparativeCharts,
  type SaveComparativeChartInput,
  type UpdateComparativeChartInput,
} from './comparative-chart.ports';

@Injectable()
export class ComparativeChartLogic implements ComparativeChartLogicI {
  constructor(
    private readonly comparativeChartRepository: ComparativeChartRepositoryI,
  ) {}

  async list(
    query: ListComparativeChartsQuery,
  ): Promise<PaginatedComparativeCharts> {
    return await this.comparativeChartRepository.list({
      status: query.status,
      statusGroup: query.statusGroup
        ? INBOX_STAGES.resources[query.statusGroup]
        : undefined,
      search: query.search,
      page: query.page,
      limit: query.limit,
      stages: INBOX_STAGES.resources,
    });
  }

  async getById(
    id: string,
    viewerId: string,
  ): Promise<ComparativeChartDetailView> {
    const chart = await this.comparativeChartRepository.findById(id, viewerId);
    if (!chart) {
      throw new ComparativeChartNotFoundError(id);
    }
    return chart;
  }

  async create(
    viewerId: string,
    input: SaveComparativeChartInput,
  ): Promise<ComparativeChartDetailView> {
    const id = await this.comparativeChartRepository.createWithLock(
      viewerId,
      input,
    );
    return await this.getById(id, viewerId);
  }

  async update(
    id: string,
    viewerId: string,
    input: UpdateComparativeChartInput,
  ): Promise<ComparativeChartDetailView> {
    await this.comparativeChartRepository.updateWithLock(id, viewerId, input);
    return await this.getById(id, viewerId);
  }

  async delete(id: string): Promise<void> {
    await this.comparativeChartRepository.deleteWithLock(id);
  }
}
