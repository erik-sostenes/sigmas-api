import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'mariadb';
import { MARIADB_POOL } from './mariadb.connection';
import { MariaDBRepository, type Row, type Tx } from './mariadb.repository';
import { INBOX_STAGES } from '../../business/purchase-request.stages';
import type {
  PurchaseType,
  RequestStatus,
} from '../../business/purchase-request.model';
import {
  PurchaseRequestRepositoryI,
  type InboxSummary,
  type StatusGroup,
  type StatusGroupCondition,
} from '../../business/purchase-request.ports';
import {
  COMPARATIVE_CHART_PURCHASE_TYPES,
  validateAndComputeComparativeChart,
  type EvaluationCriterion,
} from '../../business/comparative-chart.model';
import {
  ComparativeChartAlreadyExistsError,
  ComparativeChartNotFoundError,
  ComparativeChartProviderInvalidError,
  ComparativeChartReadOnlyError,
  ComparativeChartRequestInvalidError,
} from '../../business/comparative-chart.errors';
import {
  ComparativeChartRepositoryI,
  type ComparativeChartColumnView,
  type ComparativeChartDetailView,
  type ComparativeChartSummaryItem,
  type ListComparativeChartsRepoQuery,
  type PaginatedComparativeCharts,
  type SaveComparativeChartInput,
  type UpdateComparativeChartInput,
} from '../../business/comparative-chart.ports';

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

type ChartRow = {
  id: string;
  purchase_request_id: string;
  chart_date: Date | string;
  awarded_provider_id: number;
  highest_score: number;
  awarded_justification: string | null;
  delivery_date: Date | string | null;
  created_by: string;
  updated_by: string;
  created_at: Date;
  updated_at: Date;
};

type ColumnRow = {
  id: string;
  position: number;
  provider_id: number;
  provider_rfc: string;
  provider_name: string;
  provider_is_active: number | boolean;
  subtotal: string | number;
  iva: string | number;
  retention_iva: string | number;
  retention_isr: string | number;
  total: string | number;
  total_score: number;
};

type ItemRow = {
  comparative_chart_provider_id: string;
  product_item_id: string;
  unit_cost: string | number | null;
  total_cost: string | number | null;
};

type EvaluationRow = {
  comparative_chart_provider_id: string;
  criterion: EvaluationCriterion;
  score: number;
  observation: string;
};

function formatDateOnly(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
}

function todayDateOnly(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

@Injectable()
export class ComparativeChartRepository
  extends MariaDBRepository<ComparativeChartDetailView>
  implements ComparativeChartRepositoryI
{
  constructor(
    @Inject(MARIADB_POOL) pool: Pool,
    private readonly purchaseRequestRepository: PurchaseRequestRepositoryI,
  ) {
    super(pool);
  }

  protected toDomain(): ComparativeChartDetailView {
    throw new Error('Use findById para cargar ComparativeChartDetailView.');
  }

  async list(
    query: ListComparativeChartsRepoQuery,
  ): Promise<PaginatedComparativeCharts> {
    const groups = Object.entries(query.stages) as [
      StatusGroup,
      StatusGroupCondition,
    ][];

    const summarySelects: string[] = [];
    const summaryParams: unknown[] = [];
    const whens: string[] = [];
    const whenParams: unknown[] = [];

    for (const [name, condition] of groups) {
      const sql = `pr.status IN (${this.placeholders([...condition.statuses])})`;
      summarySelects.push(
        `SUM(CASE WHEN ${sql} THEN 1 ELSE 0 END) AS \`${name}\``,
      );
      summaryParams.push(...condition.statuses);
      whens.push(`WHEN ${sql} THEN '${name}'`);
      whenParams.push(...condition.statuses);
    }

    const summaryRows = await this.execute(
      `SELECT COUNT(*) AS total, ${summarySelects.join(', ')}
       FROM comparative_charts cc
       INNER JOIN purchase_requests pr ON pr.id = cc.purchase_request_id`,
      summaryParams,
    );

    const summaryRow = summaryRows[0] ?? {};
    const summary: InboxSummary = {
      total: Number(summaryRow.total ?? 0),
      byGroup: Object.fromEntries(
        groups.map(([name]) => [name, Number(summaryRow[name] ?? 0)]),
      ) as Record<StatusGroup, number>,
    };

    const conditions: string[] = ['1 = 1'];
    const params: unknown[] = [];

    if (query.status) {
      conditions.push('pr.status = ?');
      params.push(query.status);
    }

    if (query.statusGroup && query.statusGroup.statuses.length > 0) {
      conditions.push(
        `pr.status IN (${this.placeholders([...query.statusGroup.statuses])})`,
      );
      params.push(...query.statusGroup.statuses);
    }

    if (query.search) {
      conditions.push(
        '(pr.folio LIKE ? OR CAST(pr.request_number AS CHAR) LIKE ?)',
      );
      params.push(`%${query.search}%`, `%${query.search}%`);
    }

    const whereSql = conditions.join(' AND ');
    const countRows = await this.execute(
      `SELECT COUNT(*) AS total
       FROM comparative_charts cc
       INNER JOIN purchase_requests pr ON pr.id = cc.purchase_request_id
       WHERE ${whereSql}`,
      params,
    );

    const total = Number(countRows[0]?.total ?? 0);
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);
    const offset = (query.page - 1) * query.limit;

    const rows = await this.execute(
      `SELECT cc.id, cc.purchase_request_id, cc.chart_date, cc.highest_score,
              cc.created_at, cc.updated_at,
              pr.request_number, pr.segment_number, pr.folio, pr.purchase_type, pr.status AS request_status,
              CASE ${whens.join(' ')} ELSE 'en_proceso' END AS status_group,
              ccp.total AS total_amount,
              ap.name AS awarded_provider_name,
              u.id AS requester_id, u.title AS requester_title,
              u.first_name AS requester_first_name, u.last_name AS requester_last_name,
              u.email AS requester_email,
              d.id AS department_id, d.name AS department_name
       FROM comparative_charts cc
       INNER JOIN purchase_requests pr ON pr.id = cc.purchase_request_id
       INNER JOIN users u ON u.id = pr.requested_by
       INNER JOIN departments d ON d.id = u.department_id
       INNER JOIN providers ap ON ap.id = cc.awarded_provider_id
       INNER JOIN comparative_chart_providers ccp
         ON ccp.comparative_chart_id = cc.id AND ccp.provider_id = cc.awarded_provider_id
       WHERE ${whereSql}
       ORDER BY cc.updated_at DESC, pr.request_number DESC
       LIMIT ? OFFSET ?`,
      [...whenParams, ...params, query.limit, offset],
    );

    const data: ComparativeChartSummaryItem[] = rows.map((row) => ({
      id: String(row.id),
      purchaseRequestId: String(row.purchase_request_id),
      requestNumber: Number(row.request_number),
      segmentNumber: Number(row.segment_number ?? 0),
      folio: String(row.folio),
      purchaseType: row.purchase_type as PurchaseType,
      requestStatus: row.request_status as RequestStatus,
      statusGroup: row.status_group as StatusGroup,
      highestScore: Number(row.highest_score),
      totalAmount: Number(row.total_amount),
      awardedProviderName: String(row.awarded_provider_name),
      requester: {
        id: String(row.requester_id),
        title: typeof row.requester_title === 'string' ? row.requester_title : null,
        firstName: String(row.requester_first_name),
        lastName: String(row.requester_last_name),
        email: String(row.requester_email),
        department: {
          id: Number(row.department_id),
          name: String(row.department_name),
        },
      },
      chartDate: formatDateOnly(row.chart_date) ?? '',
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    }));

    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
      summary,
    };
  }

  async findById(
    id: string,
    viewerId: string,
  ): Promise<ComparativeChartDetailView | null> {
    const chartRows = (await this.execute(
      `SELECT id, purchase_request_id, chart_date, awarded_provider_id,
              highest_score, awarded_justification, delivery_date,
              created_by, updated_by, created_at, updated_at
       FROM comparative_charts
       WHERE id = ?
       LIMIT 1`,
      [id],
    )) as ChartRow[];

    const chart = chartRows[0];
    if (!chart) return null;

    const request = await this.purchaseRequestRepository.findInboxItem({
      id: chart.purchase_request_id,
      viewerId,
      visibility: { kind: 'statuses', statuses: RESOURCES_VISIBLE_STATUSES },
      stages: INBOX_STAGES.resources,
    });
    if (!request) return null;

    const colRows = (await this.execute(
      `SELECT ccp.id, ccp.position, ccp.provider_id,
              p.rfc AS provider_rfc, p.name AS provider_name, p.is_active AS provider_is_active,
              ccp.subtotal, ccp.iva, ccp.retention_iva, ccp.retention_isr,
              ccp.total, ccp.total_score
       FROM comparative_chart_providers ccp
       INNER JOIN providers p ON p.id = ccp.provider_id
       WHERE ccp.comparative_chart_id = ?
       ORDER BY ccp.position ASC`,
      [id],
    )) as ColumnRow[];

    const colIds = colRows.map((c) => c.id);
    const itemsByCol = new Map<string, ComparativeChartColumnView['items']>();
    const evalsByCol = new Map<
      string,
      ComparativeChartColumnView['evaluations']
    >();

    if (colIds.length > 0) {
      const itemRows = (await this.execute(
        `SELECT cci.comparative_chart_provider_id, cci.product_item_id,
                cci.unit_cost, cci.total_cost
         FROM comparative_chart_items cci
         INNER JOIN product_items pi ON pi.id = cci.product_item_id
         WHERE cci.comparative_chart_provider_id IN (${this.placeholders(colIds)})
         ORDER BY pi.position ASC`,
        colIds,
      )) as ItemRow[];

      for (const item of itemRows) {
        const list = itemsByCol.get(item.comparative_chart_provider_id) ?? [];
        list.push({
          productItemId: item.product_item_id,
          unitCost: item.unit_cost === null ? null : Number(item.unit_cost),
          totalCost: item.total_cost === null ? null : Number(item.total_cost),
        });
        itemsByCol.set(item.comparative_chart_provider_id, list);
      }

      const evalRows = (await this.execute(
        `SELECT comparative_chart_provider_id, criterion, score, observation
         FROM comparative_chart_evaluations
         WHERE comparative_chart_provider_id IN (${this.placeholders(colIds)})`,
        colIds,
      )) as EvaluationRow[];

      for (const ev of evalRows) {
        const list = evalsByCol.get(ev.comparative_chart_provider_id) ?? [];
        list.push({
          criterion: ev.criterion,
          score: Number(ev.score),
          observation: ev.observation,
        });
        evalsByCol.set(ev.comparative_chart_provider_id, list);
      }
    }

    const columns: ComparativeChartColumnView[] = colRows.map((col) => ({
      id: col.id,
      position: Number(col.position) as 1 | 2 | 3,
      provider: {
        id: Number(col.provider_id),
        rfc: col.provider_rfc,
        name: col.provider_name,
        isActive: Boolean(col.provider_is_active),
      },
      subtotal: Number(col.subtotal),
      iva: Number(col.iva),
      retentionIva: Number(col.retention_iva),
      retentionIsr: Number(col.retention_isr),
      total: Number(col.total),
      totalScore: Number(col.total_score),
      items: itemsByCol.get(col.id) ?? [],
      evaluations: evalsByCol.get(col.id) ?? [],
    }));

    return {
      id: chart.id,
      purchaseRequestId: chart.purchase_request_id,
      chartDate: formatDateOnly(chart.chart_date) ?? '',
      awardedProviderId: Number(chart.awarded_provider_id),
      highestScore: Number(chart.highest_score),
      awardedJustification: chart.awarded_justification ?? null,
      deliveryDate: formatDateOnly(chart.delivery_date),
      createdBy: chart.created_by,
      updatedBy: chart.updated_by,
      createdAt: chart.created_at,
      updatedAt: chart.updated_at,
      request,
      columns,
    };
  }

  async createWithLock(
    viewerId: string,
    input: SaveComparativeChartInput,
  ): Promise<string> {
    return this.withTransaction(async (tx) => {
      const requestRows = await this.executeOn(
        tx,
        `SELECT id, status, purchase_type
         FROM purchase_requests
         WHERE id = ?
         FOR UPDATE`,
        [input.purchaseRequestId],
      );
      const req = requestRows[0];
      if (!req || !RESOURCES_VISIBLE_STATUSES.includes(req.status as RequestStatus)) {
        throw new ComparativeChartRequestInvalidError(
          `La solicitud '${input.purchaseRequestId}' no existe o aún no está disponible para Recursos Materiales.`,
        );
      }
      if (req.status !== 'EN_REVISION_RECURSOS') {
        throw new ComparativeChartReadOnlyError(String(req.status));
      }
      if (
        !req.purchase_type ||
        !COMPARATIVE_CHART_PURCHASE_TYPES.includes(req.purchase_type as PurchaseType)
      ) {
        throw new ComparativeChartRequestInvalidError(
          'Esta modalidad de compra no utiliza Cuadro Comparativo.',
        );
      }

      const existing = await this.executeOn(
        tx,
        `SELECT id FROM comparative_charts WHERE purchase_request_id = ? LIMIT 1 FOR UPDATE`,
        [input.purchaseRequestId],
      );
      if (existing.length > 0) {
        throw new ComparativeChartAlreadyExistsError();
      }

      const productRows = await this.executeOn(
        tx,
        `SELECT id, quantity
         FROM product_items
         WHERE purchase_request_id = ?
         ORDER BY position ASC`,
        [input.purchaseRequestId],
      );

      const computed = validateAndComputeComparativeChart(
        input.columns,
        productRows.map((p) => ({ id: String(p.id), quantity: Number(p.quantity) })),
      );

      await this.assertActiveProviders(
        tx,
        computed.columns.map((c) => c.providerId),
      );

      const chartDate = input.chartDate ?? todayDateOnly();
      const justification = input.awardedJustification?.trim() || null;
      const deliveryDate = input.deliveryDate ?? null;

      const insertedChart = await this.executeOn(
        tx,
        `INSERT INTO comparative_charts
           (purchase_request_id, chart_date, awarded_provider_id, highest_score,
            awarded_justification, delivery_date, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING id`,
        [
          input.purchaseRequestId,
          chartDate,
          computed.awardedProviderId,
          computed.highestScore,
          justification,
          deliveryDate,
          viewerId,
          viewerId,
        ],
      );

      const chartId = String(insertedChart[0].id);
      await this.insertColumns(tx, chartId, computed.columns);

      return chartId;
    });
  }

  async updateWithLock(
    id: string,
    viewerId: string,
    input: UpdateComparativeChartInput,
  ): Promise<void> {
    await this.withTransaction(async (tx) => {
      const rows = await this.executeOn(
        tx,
        `SELECT cc.id, cc.purchase_request_id, cc.chart_date,
                pr.status, pr.purchase_type
         FROM comparative_charts cc
         INNER JOIN purchase_requests pr ON pr.id = cc.purchase_request_id
         WHERE cc.id = ?
         FOR UPDATE`,
        [id],
      );
      const current = rows[0];
      if (!current) {
        throw new ComparativeChartNotFoundError(id);
      }
      if (current.status !== 'EN_REVISION_RECURSOS') {
        throw new ComparativeChartReadOnlyError(String(current.status));
      }

      const productRows = await this.executeOn(
        tx,
        `SELECT id, quantity
         FROM product_items
         WHERE purchase_request_id = ?
         ORDER BY position ASC`,
        [current.purchase_request_id],
      );

      const computed = validateAndComputeComparativeChart(
        input.columns,
        productRows.map((p) => ({ id: String(p.id), quantity: Number(p.quantity) })),
      );

      await this.assertActiveProviders(
        tx,
        computed.columns.map((c) => c.providerId),
      );

      const chartDate =
        input.chartDate ??
        formatDateOnly(current.chart_date as Date | string) ??
        todayDateOnly();
      const justification = input.awardedJustification?.trim() || null;
      const deliveryDate = input.deliveryDate ?? null;

      await this.executeOn(
        tx,
        `DELETE FROM comparative_chart_providers WHERE comparative_chart_id = ?`,
        [id],
      );

      await this.executeOn(
        tx,
        `UPDATE comparative_charts
         SET chart_date = ?,
             awarded_provider_id = ?,
             highest_score = ?,
             awarded_justification = ?,
             delivery_date = ?,
             updated_by = ?
         WHERE id = ?`,
        [
          chartDate,
          computed.awardedProviderId,
          computed.highestScore,
          justification,
          deliveryDate,
          viewerId,
          id,
        ],
      );

      await this.insertColumns(tx, id, computed.columns);
    });
  }

  async deleteWithLock(id: string): Promise<void> {
    await this.withTransaction(async (tx) => {
      const rows = await this.executeOn(
        tx,
        `SELECT cc.id, pr.status
         FROM comparative_charts cc
         INNER JOIN purchase_requests pr ON pr.id = cc.purchase_request_id
         WHERE cc.id = ?
         FOR UPDATE`,
        [id],
      );
      const current = rows[0];
      if (!current) {
        throw new ComparativeChartNotFoundError(id);
      }
      if (current.status !== 'EN_REVISION_RECURSOS') {
        throw new ComparativeChartReadOnlyError(String(current.status));
      }

      await this.executeOn(tx, `DELETE FROM comparative_charts WHERE id = ?`, [
        id,
      ]);
    });
  }

  private async assertActiveProviders(
    tx: Tx,
    providerIds: number[],
  ): Promise<void> {
    const rows = (await this.executeOn(
      tx,
      `SELECT id
       FROM providers
       WHERE is_active = TRUE AND id IN (${this.placeholders(providerIds)})`,
      providerIds,
    )) as Row[];
    if (rows.length !== providerIds.length) {
      throw new ComparativeChartProviderInvalidError(
        'Uno o más proveedores seleccionados no existen o están inactivos.',
      );
    }
  }

  private async insertColumns(
    tx: Tx,
    chartId: string,
    columns: ReturnType<typeof validateAndComputeComparativeChart>['columns'],
  ): Promise<void> {
    for (const col of columns) {
      const insertedCol = await this.executeOn(
        tx,
        `INSERT INTO comparative_chart_providers
           (comparative_chart_id, provider_id, position,
            subtotal, iva, retention_iva, retention_isr, total, total_score)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING id`,
        [
          chartId,
          col.providerId,
          col.position,
          col.subtotal,
          col.iva,
          col.retentionIva,
          col.retentionIsr,
          col.total,
          col.totalScore,
        ],
      );
      const colId = String(insertedCol[0].id);

      for (const item of col.items) {
        await this.executeOn(
          tx,
          `INSERT INTO comparative_chart_items
             (comparative_chart_provider_id, product_item_id, unit_cost, total_cost)
           VALUES (?, ?, ?, ?)`,
          [colId, item.productItemId, item.unitCost, item.totalCost],
        );
      }

      for (const ev of col.evaluations) {
        await this.executeOn(
          tx,
          `INSERT INTO comparative_chart_evaluations
             (comparative_chart_provider_id, criterion, score, observation)
           VALUES (?, ?, ?, ?)`,
          [colId, ev.criterion, ev.score, ev.observation],
        );
      }
    }
  }
}
