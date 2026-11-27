import { Injectable } from '@nestjs/common';
import {
  PurchaseRequest,
  type PurchaseRequestID,
  type PurchaseRequestProps,
  type PurchaseType,
  type RequestStatus,
} from '../../business/purchase-request.model';
import {
  RequestComponent,
  type ComponentLeaderStatus,
} from '../../business/request-component.model';
import type {
  AssignPurchaseTypeInput,
  FindInboxItemRepoQuery,
  HistoryEntry,
  InboxSummary,
  InboxVisibility,
  ListInboxRepoQuery,
  PaginatedPurchaseRequests,
  PurchaseRequestComponentView,
  PurchaseRequestHistoryView,
  PurchaseRequestProductItemView,
  PurchaseRequestRepositoryI,
  PurchaseRequestView,
  SaveCounterPurchaseInput,
  SegmentRequestInput,
  SendToSufficiencyInput,
  StatusGroup,
  StatusGroupCondition,
  SummarizeInboxRepoQuery,
} from '../../business/purchase-request.ports';
import {
  ActivityNotInComponentError,
  ActivityWithoutLeaderError,
  ComparativeChartLocksRequestError,
  ComparativeChartRequiredError,
  ComponentReferenceNotFoundError,
  CounterPurchaseIncompleteError,
  DuplicatedRequestComponentError,
  InvalidComponentFinalAmountsError,
  InvalidPurchaseTypeForActionError,
  InvalidSegmentationError,
  InvalidStatusTransitionError,
  ProductReferenceNotFoundError,
  ProviderNotFoundOrInactiveError,
  PurchaseRequestAlreadyPersistedError,
  PurchaseRequestIsosNotFoundError,
  PurchaseRequestNotCreatedError,
  PurchaseRequesterNotFoundError,
} from '../../business/purchase-request.errors';
import {
  foreignKeyColumn,
  foreignKeyConstraint,
  isDuplicateEntry,
  isForeignKeyViolation,
} from './mariadb.errors';
import { MariaDBRepository, type Row, type Tx } from './mariadb.repository';

type DatabasePurchaseRequestRow = {
  id: string;
  parent_request_id: string | null;
  request_number: number;
  segment_number: number;
  folio: string;
  requested_by: string;
  status: RequestStatus;
  purchase_type: PurchaseType | null;
  awarded_provider_id: number | null;
  iso_ids: unknown;
  justification: string;
  total_amount_estimated: string | number;
  final_subtotal: string | number;
  final_iva: string | number;
  final_retention_iva: string | number;
  final_retention_isr: string | number;
  total_amount_final: string | number;
  created_at: Date;
  updated_at: Date;
};

type DatabaseRequestComponentRow = {
  id: string;
  component_id: number;
  activity_id: number;
  funding_source_id: number;
  estimated_amount: string | number;
  final_amount: string | number;
  leader_id: string;
  leader_status: ComponentLeaderStatus;
  leader_decided_at: Date | null;
};

type DatabaseProductItemRow = {
  id: string;
  budget_item_id: number;
  measurement_unit_id: number;
  quantity: string | number;
  description: string;
  estimated_amount: string | number;
  final_amount: string | number;
  position: number;
};

type DatabaseInboxRow = {
  id: string;
  parent_request_id: string | null;
  request_number: number;
  segment_number: number;
  folio: string;
  status: RequestStatus;
  purchase_type: PurchaseType | null;
  justification: string;
  total_amount_estimated: string | number;
  final_subtotal: string | number;
  final_iva: string | number;
  final_retention_iva: string | number;
  final_retention_isr: string | number;
  total_amount_final: string | number;
  awarded_provider_id: number | null;
  awarded_provider_rfc: string | null;
  awarded_provider_name: string | null;
  comparative_chart_id: string | null;
  comparative_chart_highest_score: number | null;
  comparative_chart_total_amount: string | number | null;
  comparative_chart_awarded_provider_name: string | null;
  comparative_chart_updated_at: Date | null;
  created_at: Date;
  updated_at: Date;
  requester_id: string;
  requester_title: string | null;
  requester_first_name: string;
  requester_last_name: string;
  requester_email: string;
  department_id: number;
  department_name: string;
  status_group: StatusGroup;
  isos: unknown;
  components: unknown;
  product_items: unknown;
  history: unknown;
};

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

const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

type VisibilitySql = {
  // Condición del WHERE sobre pr (puede usar me.uid)
  where: string;
  params: unknown[];
  // Condición extra sobre rc para las filas que se regresan
  componentsFilter: string;
};

@Injectable()
export class PurchaseRequestRepository
  extends MariaDBRepository<PurchaseRequest>
  implements PurchaseRequestRepositoryI
{
  async save(request: PurchaseRequest): Promise<PurchaseRequestID> {
    if (request.id) {
      throw new PurchaseRequestAlreadyPersistedError();
    }

    return this.withTransaction(async (tx) => {
      const id = await this.insertPurchaseRequest(tx, request);

      await this.insertPurchaseRequestIsos(tx, id, request.isoIds);

      for (const component of request.requestComponents) {
        await this.insertRequestComponent(tx, id, component);
      }

      // position conserva el orden en que el solicitante capturó los productos
      for (const [position, item] of request.productItems.entries()) {
        await this.insertProductItem(tx, id, item, position);
      }

      return id;
    });
  }

  // Un solo recorrido: el total de la bandeja y cuántas hay en cada etapa.
  async summarizeInbox(query: SummarizeInboxRepoQuery): Promise<InboxSummary> {
    const visibility = this.buildVisibilitySql(query.visibility);
    const groups = Object.entries(query.groups) as [
      StatusGroup,
      StatusGroupCondition,
    ][];

    const selects: string[] = [];
    const selectParams: unknown[] = [];
    for (const [name, condition] of groups) {
      const group = this.buildStatusGroupSql(condition);
      selects.push(
        `SUM(CASE WHEN ${group.sql} THEN 1 ELSE 0 END) AS \`${name}\``,
      );
      selectParams.push(...group.params);
    }

    // Los parámetros del SELECT van antes que el de me.uid (FROM) y los del WHERE.
    const rows = await this.execute(
      `SELECT COUNT(*) AS total, ${selects.join(', ')}
       FROM purchase_requests pr
       CROSS JOIN (SELECT ? AS uid) me
       WHERE ${visibility.where}`,
      [...selectParams, query.viewerId, ...visibility.params],
    );

    const row = rows[0] ?? {};
    return {
      total: Number(row.total ?? 0),
      byGroup: Object.fromEntries(
        groups.map(([name]) => [name, Number(row[name] ?? 0)]),
      ) as Record<StatusGroup, number>,
    };
  }

  async listInbox(
    query: ListInboxRepoQuery,
  ): Promise<PaginatedPurchaseRequests> {
    const offset = (query.page - 1) * query.limit;
    const visibility = this.buildVisibilitySql(
      query.visibility,
      query.leaderStatus,
    );

    const conditions = [visibility.where];
    const params: unknown[] = [...visibility.params];

    if (query.status) {
      conditions.push('pr.status = ?');
      params.push(query.status);
    }

    if (query.unclassified) {
      conditions.push(
        "pr.status = 'AUTORIZA_SUFICIENCIA' AND pr.purchase_type IS NULL",
      );
    }

    if (query.purchaseTypes && query.purchaseTypes.length > 0) {
      conditions.push(
        `pr.purchase_type IN (${this.placeholders(query.purchaseTypes)})`,
      );
      params.push(...query.purchaseTypes);
    }

    if (query.statusGroup) {
      const group = this.buildStatusGroupSql(query.statusGroup);
      conditions.push(group.sql);
      params.push(...group.params);
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
       FROM purchase_requests pr
       CROSS JOIN (SELECT ? AS uid) me
       WHERE ${whereSql}`,
      [query.viewerId, ...params],
    );

    const total = Number(countRows[0]?.total ?? 0);
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

    const select = this.buildViewSelectSql(
      visibility.componentsFilter,
      query.stages,
      query.viewerId,
    );
    const rows = (await this.execute(
      `${select.sql}
       WHERE ${whereSql}
       ORDER BY pr.request_number DESC, pr.segment_number ASC
       LIMIT ? OFFSET ?`,
      [...select.params, ...params, query.limit, offset],
    )) as DatabaseInboxRow[];

    return {
      data: rows.map((row) => this.mapRowToView(row)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    };
  }

  async findInboxItem(
    query: FindInboxItemRepoQuery,
  ): Promise<PurchaseRequestView | null> {
    const visibility = this.buildVisibilitySql(query.visibility);

    const select = this.buildViewSelectSql(
      visibility.componentsFilter,
      query.stages,
      query.viewerId,
    );
    const rows = (await this.execute(
      `${select.sql}
       WHERE pr.id = ? AND ${visibility.where}
       LIMIT 1`,
      [...select.params, query.id, ...visibility.params],
    )) as DatabaseInboxRow[];

    const row = rows[0];
    return row ? this.mapRowToView(row) : null;
  }

  // El FOR UPDATE sobre la solicitud serializa las decisiones concurrentes
  // (p. ej. dos líderes aprobando al mismo tiempo).
  async updateWithLock(
    id: PurchaseRequestID,
    change: (request: PurchaseRequest) => HistoryEntry,
  ): Promise<boolean> {
    return this.withTransaction(async (tx) => {
      const requestRows = await this.executeOn(
        tx,
        `SELECT pr.*, NULL AS iso_ids
         FROM purchase_requests pr
         WHERE pr.id = ?
         FOR UPDATE`,
        [id],
      );
      if (!requestRows[0]) return false;

      const componentRows = (await this.executeOn(
        tx,
        `SELECT id, component_id, activity_id, funding_source_id,
                estimated_amount, final_amount,
                leader_id, leader_status, leader_decided_at
         FROM request_components
         WHERE purchase_request_id = ?
         FOR UPDATE`,
        [id],
      )) as DatabaseRequestComponentRow[];

      // Solo se carga lo que las decisiones necesitan: cabecera y filas.
      const request = PurchaseRequest.rehydrate({
        ...this.toDomainProps(requestRows[0] as DatabasePurchaseRequestRow),
        requestComponents: componentRows.map((row) =>
          RequestComponent.rehydrate({
            id: row.id,
            purchaseRequestId: id,
            componentId: Number(row.component_id),
            activityId: Number(row.activity_id),
            fundingSourceId: Number(row.funding_source_id),
            estimatedAmount: Number(row.estimated_amount),
            finalAmount: Number(row.final_amount),
            leaderId: row.leader_id,
            leaderStatus: row.leader_status,
            leaderDecidedAt: row.leader_decided_at,
          }),
        ),
      });

      const entry = change(request);

      await this.executeOn(
        tx,
        `UPDATE purchase_requests SET status = ? WHERE id = ?`,
        [request.status, id],
      );

      for (const row of request.requestComponents) {
        await this.executeOn(
          tx,
          `UPDATE request_components
           SET leader_status = ?, leader_decided_at = ?
           WHERE id = ?`,
          [row.leaderStatus, row.leaderDecidedAt, row.id],
        );
      }

      await this.executeOn(
        tx,
        `INSERT INTO purchase_request_history
           (purchase_request_id, request_component_id, status_before, status_after,
            decision, user_id, justification)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          entry.requestComponentId ?? null,
          entry.statusBefore,
          entry.statusAfter,
          entry.decision,
          entry.userId,
          entry.justification?.trim() || null,
        ],
      );

      return true;
    });
  }

  async assignPurchaseTypeWithLock(
    input: AssignPurchaseTypeInput,
  ): Promise<boolean> {
    return this.withTransaction(async (tx) => {
      const requestRows = (await this.executeOn(
        tx,
        `SELECT pr.*, NULL AS iso_ids
         FROM purchase_requests pr
         WHERE pr.id = ?
         FOR UPDATE`,
        [input.purchaseRequestId],
      )) as DatabasePurchaseRequestRow[];
      const row = requestRows[0];
      if (!row || !RESOURCES_VISIBLE_STATUSES.includes(row.status)) {
        return false;
      }

      const chartRows = await this.executeOn(
        tx,
        `SELECT id FROM comparative_charts WHERE purchase_request_id = ? LIMIT 1 FOR UPDATE`,
        [input.purchaseRequestId],
      );
      if (chartRows.length > 0) {
        throw new ComparativeChartLocksRequestError();
      }

      const request = PurchaseRequest.rehydrate(this.toDomainProps(row));
      const statusBefore = request.status;
      const transitioned = request.assignPurchaseType(input.purchaseType);

      const clearCounterFields =
        input.purchaseType !== 'COMPRA_MOSTRADOR' &&
        row.purchase_type === 'COMPRA_MOSTRADOR';

      await this.executeOn(
        tx,
        `UPDATE purchase_requests
         SET purchase_type = ?,
             status = ?,
             awarded_provider_id = CASE WHEN ? THEN NULL ELSE awarded_provider_id END,
             final_subtotal = CASE WHEN ? THEN 0.00 ELSE final_subtotal END,
             final_iva = CASE WHEN ? THEN 0.00 ELSE final_iva END,
             final_retention_iva = CASE WHEN ? THEN 0.00 ELSE final_retention_iva END,
             final_retention_isr = CASE WHEN ? THEN 0.00 ELSE final_retention_isr END,
             total_amount_final = CASE WHEN ? THEN 0.00 ELSE total_amount_final END
         WHERE id = ?`,
        [
          request.purchaseType,
          request.status,
          clearCounterFields ? 1 : 0,
          clearCounterFields ? 1 : 0,
          clearCounterFields ? 1 : 0,
          clearCounterFields ? 1 : 0,
          clearCounterFields ? 1 : 0,
          clearCounterFields ? 1 : 0,
          input.purchaseRequestId,
        ],
      );

      if (transitioned) {
        await this.executeOn(
          tx,
          `INSERT INTO purchase_request_history
             (purchase_request_id, request_component_id, status_before, status_after,
              decision, user_id, justification)
           VALUES (?, NULL, ?, ?, 'APROBADO', ?, NULL)`,
          [input.purchaseRequestId, statusBefore, request.status, input.userId],
        );
      }

      return true;
    });
  }

  async segmentWithLock(
    input: SegmentRequestInput,
  ): Promise<{ derivedId: PurchaseRequestID } | null> {
    return this.withTransaction(async (tx) => {
      const requestRows = (await this.executeOn(
        tx,
        `SELECT pr.*, NULL AS iso_ids
         FROM purchase_requests pr
         WHERE pr.id = ?
         FOR UPDATE`,
        [input.purchaseRequestId],
      )) as DatabasePurchaseRequestRow[];
      const row = requestRows[0];
      if (!row || !RESOURCES_VISIBLE_STATUSES.includes(row.status)) {
        return null;
      }

      if (row.status !== 'EN_REVISION_RECURSOS' || !row.purchase_type) {
        throw new InvalidStatusTransitionError(
          row.status,
          'EN_REVISION_RECURSOS',
        );
      }

      const chartRows = await this.executeOn(
        tx,
        `SELECT id FROM comparative_charts WHERE purchase_request_id = ? LIMIT 1 FOR UPDATE`,
        [input.purchaseRequestId],
      );
      if (chartRows.length > 0) {
        throw new ComparativeChartLocksRequestError();
      }

      const productRows = (await this.executeOn(
        tx,
        `SELECT id, budget_item_id, measurement_unit_id, quantity, description,
                estimated_amount, final_amount, position
         FROM product_items
         WHERE purchase_request_id = ?
         ORDER BY position ASC
         FOR UPDATE`,
        [input.purchaseRequestId],
      )) as DatabaseProductItemRow[];

      if (productRows.length <= 1) {
        throw new InvalidSegmentationError(
          'la solicitud debe tener más de 1 producto para segmentarse.',
        );
      }

      const selectedSet = new Set(input.productItemIds);
      if (selectedSet.size !== input.productItemIds.length) {
        throw new InvalidSegmentationError(
          'no se permiten productos duplicados.',
        );
      }
      if (selectedSet.size === 0) {
        throw new InvalidSegmentationError(
          'debes seleccionar al menos 1 producto para el subfolio.',
        );
      }
      const existingIds = new Set(productRows.map((p) => p.id));
      for (const id of selectedSet) {
        if (!existingIds.has(id)) {
          throw new InvalidSegmentationError(
            `el producto '${id}' no pertenece a esta solicitud.`,
          );
        }
      }
      const remainingItems = productRows.filter((p) => !selectedSet.has(p.id));
      const movedItems = productRows.filter((p) => selectedSet.has(p.id));
      if (remainingItems.length === 0) {
        throw new InvalidSegmentationError(
          'la solicitud original debe conservar al menos 1 producto.',
        );
      }

      const originalEstimated = roundMoney(
        remainingItems.reduce((sum, p) => sum + Number(p.estimated_amount), 0),
      );
      const derivedEstimated = roundMoney(
        movedItems.reduce((sum, p) => sum + Number(p.estimated_amount), 0),
      );

      const componentRows = (await this.executeOn(
        tx,
        `SELECT id, component_id, activity_id, funding_source_id,
                estimated_amount, final_amount, leader_id, leader_status, leader_decided_at
         FROM request_components
         WHERE purchase_request_id = ?
         ORDER BY id ASC
         FOR UPDATE`,
        [input.purchaseRequestId],
      )) as DatabaseRequestComponentRow[];

      let resolvedAllocations: {
        row: DatabaseRequestComponentRow;
        originalAmount: number;
        derivedAmount: number;
      }[];

      if (componentRows.length === 1) {
        resolvedAllocations = [
          {
            row: componentRows[0],
            originalAmount: originalEstimated,
            derivedAmount: derivedEstimated,
          },
        ];
      } else {
        const allocations = input.componentAllocations ?? [];
        if (allocations.length !== componentRows.length) {
          throw new InvalidSegmentationError(
            'debes distribuir manualmente los montos estimados entre todas las actividades de la solicitud.',
          );
        }
        const byId = new Map(allocations.map((a) => [a.requestComponentId, a]));
        if (byId.size !== componentRows.length) {
          throw new InvalidSegmentationError(
            'hay actividades duplicadas o faltantes en la distribución.',
          );
        }

        let sumOriginal = 0;
        let sumDerived = 0;
        resolvedAllocations = componentRows.map((comp) => {
          const alloc = byId.get(comp.id);
          if (!alloc) {
            throw new InvalidSegmentationError(
              `falta la distribución para la actividad '${comp.id}'.`,
            );
          }
          if (
            alloc.originalEstimatedAmount < 0 ||
            alloc.derivedEstimatedAmount < 0
          ) {
            throw new InvalidSegmentationError(
              'los montos distribuidos deben ser mayores o iguales a $0.00.',
            );
          }
          const originalAmount = roundMoney(alloc.originalEstimatedAmount);
          const derivedAmount = roundMoney(alloc.derivedEstimatedAmount);
          sumOriginal = roundMoney(sumOriginal + originalAmount);
          sumDerived = roundMoney(sumDerived + derivedAmount);
          return { row: comp, originalAmount, derivedAmount };
        });

        if (Math.abs(sumOriginal - originalEstimated) > 0.01) {
          throw new InvalidSegmentationError(
            `la suma para la solicitud original ($${sumOriginal.toFixed(2)}) debe coincidir con sus productos ($${originalEstimated.toFixed(2)}).`,
          );
        }
        if (Math.abs(sumDerived - derivedEstimated) > 0.01) {
          throw new InvalidSegmentationError(
            `la suma para el subfolio ($${sumDerived.toFixed(2)}) debe coincidir con los productos movidos ($${derivedEstimated.toFixed(2)}).`,
          );
        }
      }

      const maxRows = await this.executeOn(
        tx,
        `SELECT COALESCE(MAX(segment_number), 0) AS max_segment
         FROM purchase_requests
         WHERE request_number = ?
         FOR UPDATE`,
        [row.request_number],
      );
      const nextSegment = Number(maxRows[0]?.max_segment ?? 0) + 1;
      const rootParentId = row.parent_request_id ?? row.id;

      const insertedDerived = await this.executeOn(
        tx,
        `INSERT INTO purchase_requests
           (parent_request_id, request_number, segment_number, requested_by,
            status, purchase_type, awarded_provider_id, justification,
            total_amount_estimated, final_subtotal, final_iva,
            final_retention_iva, final_retention_isr, total_amount_final)
         VALUES (?, ?, ?, ?, 'AUTORIZA_SUFICIENCIA', NULL, NULL, ?, ?, 0.00, 0.00, 0.00, 0.00, 0.00)
         RETURNING id`,
        [
          rootParentId,
          row.request_number,
          nextSegment,
          row.requested_by,
          row.justification,
          derivedEstimated,
        ],
      );
      const derivedId = insertedDerived[0]?.id as string | undefined;
      if (!derivedId) {
        throw new PurchaseRequestNotCreatedError();
      }

      await this.executeOn(
        tx,
        `INSERT INTO purchase_request_isos (purchase_request_id, iso_id)
         SELECT ?, iso_id
         FROM purchase_request_isos
         WHERE purchase_request_id = ?`,
        [derivedId, input.purchaseRequestId],
      );

      const componentIdMap = new Map<string, string>();
      for (const alloc of resolvedAllocations) {
        await this.executeOn(
          tx,
          `UPDATE request_components
           SET estimated_amount = ?, final_amount = 0.00
           WHERE id = ?`,
          [alloc.originalAmount, alloc.row.id],
        );

        if (alloc.derivedAmount > 0 || resolvedAllocations.length === 1) {
          const insertedComp = await this.executeOn(
            tx,
            `INSERT INTO request_components
               (purchase_request_id, component_id, activity_id, funding_source_id,
                estimated_amount, final_amount, leader_id, leader_status, leader_decided_at)
             VALUES (?, ?, ?, ?, ?, 0.00, ?, ?, ?)
             RETURNING id`,
            [
              derivedId,
              alloc.row.component_id,
              alloc.row.activity_id,
              alloc.row.funding_source_id,
              alloc.derivedAmount,
              alloc.row.leader_id,
              alloc.row.leader_status,
              alloc.row.leader_decided_at,
            ],
          );
          if (insertedComp[0]?.id) {
            componentIdMap.set(alloc.row.id, String(insertedComp[0].id));
          }
        }
      }

      // Copiar historial heredado (líderes + primera autorización de suficiencia) al subfolio.
      const inheritedHistory = await this.executeOn(
        tx,
        `SELECT request_component_id, status_before, status_after, decision,
                user_id, signer_name, justification, created_at
         FROM purchase_request_history
         WHERE purchase_request_id = ?
           AND status_before IN ('SOLICITADO', 'APRUEBA_LIDER')
         ORDER BY created_at ASC`,
        [input.purchaseRequestId],
      );
      for (const h of inheritedHistory) {
        const mappedCompId = h.request_component_id
          ? (componentIdMap.get(String(h.request_component_id)) ?? null)
          : null;
        if (h.request_component_id && !mappedCompId) continue;
        await this.executeOn(
          tx,
          `INSERT INTO purchase_request_history
             (purchase_request_id, request_component_id, status_before, status_after,
              decision, user_id, signer_name, justification, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            derivedId,
            mappedCompId,
            h.status_before,
            h.status_after,
            h.decision,
            h.user_id,
            h.signer_name,
            h.justification,
            h.created_at,
          ],
        );
      }

      // Desplazar temporalmente las posiciones para evitar colisiones en uq_product_item_position.
      await this.executeOn(
        tx,
        `UPDATE product_items
         SET position = position + 10000
         WHERE purchase_request_id = ?`,
        [input.purchaseRequestId],
      );

      for (const [pos, item] of movedItems.entries()) {
        await this.executeOn(
          tx,
          `UPDATE product_items
           SET purchase_request_id = ?, position = ?, final_amount = 0.00
           WHERE id = ?`,
          [derivedId, pos, item.id],
        );
      }

      for (const [pos, item] of remainingItems.entries()) {
        await this.executeOn(
          tx,
          `UPDATE product_items
           SET position = ?, final_amount = 0.00
           WHERE id = ?`,
          [pos, item.id],
        );
      }

      await this.executeOn(
        tx,
        `UPDATE purchase_requests
         SET total_amount_estimated = ?,
             awarded_provider_id = NULL,
             final_subtotal = 0.00,
             final_iva = 0.00,
             final_retention_iva = 0.00,
             final_retention_isr = 0.00,
             total_amount_final = 0.00
         WHERE id = ?`,
        [originalEstimated, input.purchaseRequestId],
      );

      return { derivedId };
    });
  }

  async saveCounterPurchaseWithLock(
    input: SaveCounterPurchaseInput,
  ): Promise<boolean> {
    return this.withTransaction(async (tx) => {
      const requestRows = (await this.executeOn(
        tx,
        `SELECT pr.*, NULL AS iso_ids
         FROM purchase_requests pr
         WHERE pr.id = ?
         FOR UPDATE`,
        [input.purchaseRequestId],
      )) as DatabasePurchaseRequestRow[];
      const row = requestRows[0];
      if (!row || !RESOURCES_VISIBLE_STATUSES.includes(row.status)) {
        return false;
      }

      if (row.status !== 'EN_REVISION_RECURSOS') {
        throw new InvalidStatusTransitionError(
          row.status,
          'EN_REVISION_RECURSOS',
        );
      }
      if (row.purchase_type !== 'COMPRA_MOSTRADOR') {
        throw new InvalidPurchaseTypeForActionError(
          'captura de compra de mostrador',
          row.purchase_type,
        );
      }

      const providerRows = await this.executeOn(
        tx,
        `SELECT id FROM providers WHERE id = ? AND is_active = TRUE LIMIT 1`,
        [input.awardedProviderId],
      );
      if (providerRows.length === 0) {
        throw new ProviderNotFoundOrInactiveError(input.awardedProviderId);
      }

      const request = PurchaseRequest.rehydrate(this.toDomainProps(row));
      request.applyCounterPurchase(
        input.awardedProviderId,
        input.totalAmountFinal,
      );

      await this.executeOn(
        tx,
        `UPDATE purchase_requests
         SET awarded_provider_id = ?,
             final_subtotal = ?,
             final_iva = 0.00,
             final_retention_iva = 0.00,
             final_retention_isr = 0.00,
             total_amount_final = ?
         WHERE id = ?`,
        [
          request.awardedProviderId,
          request.finalSubtotal,
          request.totalAmountFinal,
          input.purchaseRequestId,
        ],
      );

      return true;
    });
  }

  async sendToSufficiencyWithLock(
    input: SendToSufficiencyInput,
  ): Promise<boolean> {
    return this.withTransaction(async (tx) => {
      const requestRows = (await this.executeOn(
        tx,
        `SELECT pr.*, NULL AS iso_ids
         FROM purchase_requests pr
         WHERE pr.id = ?
         FOR UPDATE`,
        [input.purchaseRequestId],
      )) as DatabasePurchaseRequestRow[];
      const row = requestRows[0];
      if (!row || !RESOURCES_VISIBLE_STATUSES.includes(row.status)) {
        return false;
      }

      if (row.status !== 'EN_REVISION_RECURSOS') {
        throw new InvalidStatusTransitionError(
          row.status,
          'PENDIENTE_APROBACION_SUFICIENCIA',
        );
      }
      if (!row.purchase_type) {
        throw new InvalidPurchaseTypeForActionError(
          'enviar a Suficiencia',
          null,
        );
      }

      const componentRows = (await this.executeOn(
        tx,
        `SELECT id, component_id, activity_id, funding_source_id,
                estimated_amount, final_amount, leader_id, leader_status, leader_decided_at
         FROM request_components
         WHERE purchase_request_id = ?
         FOR UPDATE`,
        [input.purchaseRequestId],
      )) as DatabaseRequestComponentRow[];

      let awardedProviderId: number;
      let finalSubtotal: number;
      let finalIva: number;
      let finalRetentionIva: number;
      let finalRetentionIsr: number;
      let finalTotal: number;

      if (row.purchase_type === 'COMPRA_MOSTRADOR') {
        if (!row.awarded_provider_id || Number(row.total_amount_final) <= 0) {
          throw new CounterPurchaseIncompleteError();
        }
        awardedProviderId = Number(row.awarded_provider_id);
        finalTotal = roundMoney(Number(row.total_amount_final));
        finalSubtotal = finalTotal;
        finalIva = 0;
        finalRetentionIva = 0;
        finalRetentionIsr = 0;
      } else {
        const chartRows = await this.executeOn(
          tx,
          `SELECT id, awarded_provider_id
           FROM comparative_charts
           WHERE purchase_request_id = ?
           LIMIT 1
           FOR UPDATE`,
          [input.purchaseRequestId],
        );
        const chart = chartRows[0];
        if (!chart) {
          throw new ComparativeChartRequiredError();
        }

        const providerRows = await this.executeOn(
          tx,
          `SELECT id, subtotal, iva, retention_iva, retention_isr, total
           FROM comparative_chart_providers
           WHERE comparative_chart_id = ? AND provider_id = ?
           LIMIT 1`,
          [chart.id, chart.awarded_provider_id],
        );
        const winnerCol = providerRows[0];
        if (!winnerCol) {
          throw new ComparativeChartRequiredError();
        }

        const quotedItems = await this.executeOn(
          tx,
          `SELECT product_item_id, total_cost
           FROM comparative_chart_items
           WHERE comparative_chart_provider_id = ?`,
          [winnerCol.id],
        );
        for (const item of quotedItems) {
          await this.executeOn(
            tx,
            `UPDATE product_items
             SET final_amount = ?
             WHERE id = ? AND purchase_request_id = ?`,
            [
              item.total_cost === null ? 0 : roundMoney(Number(item.total_cost)),
              item.product_item_id,
              input.purchaseRequestId,
            ],
          );
        }

        awardedProviderId = Number(chart.awarded_provider_id);
        finalSubtotal = roundMoney(Number(winnerCol.subtotal));
        finalIva = roundMoney(Number(winnerCol.iva));
        finalRetentionIva = roundMoney(Number(winnerCol.retention_iva));
        finalRetentionIsr = roundMoney(Number(winnerCol.retention_isr));
        finalTotal = roundMoney(Number(winnerCol.total));
      }

      if (componentRows.length === 1) {
        await this.executeOn(
          tx,
          `UPDATE request_components SET final_amount = ? WHERE id = ?`,
          [finalTotal, componentRows[0].id],
        );
      } else {
        const allocations = input.componentFinalAmounts ?? [];
        if (allocations.length !== componentRows.length) {
          throw new InvalidComponentFinalAmountsError(
            'debes distribuir manualmente el monto final entre todas las actividades de la solicitud.',
          );
        }
        const byId = new Map(allocations.map((a) => [a.requestComponentId, a]));
        if (byId.size !== componentRows.length) {
          throw new InvalidComponentFinalAmountsError(
            'hay actividades duplicadas o faltantes en la distribución.',
          );
        }

        let sumFinal = 0;
        for (const comp of componentRows) {
          const item = byId.get(comp.id);
          if (!item) {
            throw new InvalidComponentFinalAmountsError(
              `falta el monto para la actividad '${comp.id}'.`,
            );
          }
          if (item.finalAmount < 0) {
            throw new InvalidComponentFinalAmountsError(
              'ningún monto por actividad puede ser negativo.',
            );
          }
          const amount = roundMoney(item.finalAmount);
          sumFinal = roundMoney(sumFinal + amount);
          await this.executeOn(
            tx,
            `UPDATE request_components SET final_amount = ? WHERE id = ?`,
            [amount, comp.id],
          );
        }

        if (Math.abs(sumFinal - finalTotal) > 0.01) {
          throw new InvalidComponentFinalAmountsError(
            `la suma de los montos por actividad ($${sumFinal.toFixed(2)}) debe coincidir con el monto final ($${finalTotal.toFixed(2)}).`,
          );
        }
      }

      await this.executeOn(
        tx,
        `UPDATE purchase_requests
         SET status = 'PENDIENTE_APROBACION_SUFICIENCIA',
             awarded_provider_id = ?,
             final_subtotal = ?,
             final_iva = ?,
             final_retention_iva = ?,
             final_retention_isr = ?,
             total_amount_final = ?
         WHERE id = ?`,
        [
          awardedProviderId,
          finalSubtotal,
          finalIva,
          finalRetentionIva,
          finalRetentionIsr,
          finalTotal,
          input.purchaseRequestId,
        ],
      );

      await this.executeOn(
        tx,
        `INSERT INTO purchase_request_history
           (purchase_request_id, request_component_id, status_before, status_after,
            decision, user_id, justification)
         VALUES (?, NULL, 'EN_REVISION_RECURSOS', 'PENDIENTE_APROBACION_SUFICIENCIA', 'APROBADO', ?, NULL)`,
        [input.purchaseRequestId, input.userId],
      );

      return true;
    });
  }

  // ==========================================
  // Query Builders
  // ==========================================

  // Condición booleana sobre pr para una etapa (pestaña): sus estados, más SOLICITADO
  // según si algún líder ya decidió, o si a quien consulta (me.uid) le queda una fila pendiente.
  private buildStatusGroupSql(group: StatusGroupCondition): {
    sql: string;
    params: unknown[];
  } {
    const parts: string[] = [];
    const params: unknown[] = [];

    if (group.statuses.length > 0) {
      parts.push(`pr.status IN (${this.placeholders([...group.statuses])})`);
      params.push(...group.statuses);
    }

    if (group.solicitado) {
      const anyDecided = `EXISTS (
        SELECT 1 FROM request_components drc
        WHERE drc.purchase_request_id = pr.id AND drc.leader_status <> 'PENDIENTE'
      )`;
      const ownPending = `EXISTS (
        SELECT 1 FROM request_components orc
        WHERE orc.purchase_request_id = pr.id
          AND orc.leader_id = me.uid AND orc.leader_status = 'PENDIENTE'
      )`;
      const condition = {
        sin_decisiones: `NOT ${anyDecided}`,
        con_decisiones: anyDecided,
        fila_propia_pendiente: ownPending,
        sin_fila_propia_pendiente: `NOT ${ownPending}`,
      }[group.solicitado];
      parts.push(`(pr.status = 'SOLICITADO' AND ${condition})`);
    }

    return { sql: `(${parts.join(' OR ') || '1 = 0'})`, params };
  }

  private buildVisibilitySql(
    visibility: InboxVisibility,
    leaderStatus?: ComponentLeaderStatus,
  ): VisibilitySql {
    switch (visibility.kind) {
      case 'requester':
        return {
          where: 'pr.requested_by = me.uid',
          params: [],
          componentsFilter: '',
        };
      case 'leader':
        // El líder solo recibe sus filas: no ve cuánto se le pide a los demás.
        return {
          where: `EXISTS (
            SELECT 1
            FROM request_components lrc
            WHERE lrc.purchase_request_id = pr.id
              AND lrc.leader_id = me.uid
              ${leaderStatus ? 'AND lrc.leader_status = ?' : ''}
          )`,
          params: leaderStatus ? [leaderStatus] : [],
          componentsFilter: 'AND rc.leader_id = me.uid',
        };
      case 'statuses':
        return {
          where: `pr.status IN (${this.placeholders([...visibility.statuses])})`,
          params: [...visibility.statuses],
          componentsFilter: '',
        };
    }
  }

  // statusGroup se calcula con las etapas de la bandeja (CASE en el orden de las etapas).
  // `params` ya trae, en orden, los del CASE y el de me.uid (FROM): van antes que los del WHERE.
  private buildViewSelectSql(
    componentsFilter: string,
    stages: Record<StatusGroup, StatusGroupCondition>,
    viewerId: string,
  ): { sql: string; params: unknown[] } {
    const whens: string[] = [];
    const params: unknown[] = [];
    for (const [name, condition] of Object.entries(stages) as [
      StatusGroup,
      StatusGroupCondition,
    ][]) {
      const group = this.buildStatusGroupSql(condition);
      whens.push(`WHEN ${group.sql} THEN '${name}'`);
      params.push(...group.params);
    }

    return {
      params: [...params, viewerId],
      sql: `SELECT pr.id, pr.parent_request_id, pr.request_number, pr.segment_number, pr.folio,
              pr.status, pr.purchase_type, pr.justification,
              pr.total_amount_estimated, pr.final_subtotal, pr.final_iva,
              pr.final_retention_iva, pr.final_retention_isr, pr.total_amount_final,
              pr.created_at, pr.updated_at,
         ap.id AS awarded_provider_id,
         ap.rfc AS awarded_provider_rfc,
         ap.name AS awarded_provider_name,
         cc.id AS comparative_chart_id,
         cc.highest_score AS comparative_chart_highest_score,
         ccp.total AS comparative_chart_total_amount,
         ccp_prov.name AS comparative_chart_awarded_provider_name,
         cc.updated_at AS comparative_chart_updated_at,
         u.id AS requester_id,
         u.title AS requester_title,
         u.first_name AS requester_first_name,
         u.last_name AS requester_last_name,
         u.email AS requester_email,
         d.id AS department_id,
         d.name AS department_name,
         CASE ${whens.join(' ')} ELSE 'en_proceso' END AS status_group,
         (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', i.id, 'name', i.name) ORDER BY i.id)
          FROM purchase_request_isos pri
          INNER JOIN isos i ON i.id = pri.iso_id
          WHERE pri.purchase_request_id = pr.id) AS isos,
         (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                   'id', rc.id,
                   'componentId', c.id, 'componentCode', c.code, 'componentName', c.name,
                   'activityId', a.id, 'activityCode', a.code, 'activityName', a.name,
                   'administrativeUnitId', au.id, 'administrativeUnitCode', au.code,
                   'administrativeUnitName', au.name,
                   'fundingSourceId', fs.id, 'fundingSourceCode', fs.code,
                   'fundingSourceName', fs.name,
                   'estimatedAmount', rc.estimated_amount,
                   'finalAmount', rc.final_amount,
                   'leaderId', lu.id, 'leaderTitle', lu.title,
                   'leaderFirstName', lu.first_name, 'leaderLastName', lu.last_name,
                   'leaderStatus', rc.leader_status,
                   'leaderDecidedAt', rc.leader_decided_at)
                 ORDER BY c.code, a.code, fs.code)
          FROM request_components rc
          INNER JOIN components c ON c.id = rc.component_id
          INNER JOIN activities a ON a.id = rc.activity_id
          INNER JOIN administrative_units au ON au.id = c.administrative_unit_id
          INNER JOIN funding_sources fs ON fs.id = rc.funding_source_id
          INNER JOIN users lu ON lu.id = rc.leader_id
          WHERE rc.purchase_request_id = pr.id
            ${componentsFilter}) AS components,
         (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                   'id', pi.id,
                   'budgetItemId', bi.id, 'budgetItemCode', bi.code, 'budgetItemName', bi.name,
                   'measurementUnitId', mu.id, 'measurementUnitName', mu.name,
                   'quantity', pi.quantity,
                   'description', pi.description,
                   'estimatedAmount', pi.estimated_amount,
                   'finalAmount', pi.final_amount)
                 ORDER BY pi.position)
          FROM product_items pi
          INNER JOIN budget_items bi ON bi.id = pi.budget_item_id
          INNER JOIN measurement_units mu ON mu.id = pi.measurement_unit_id
          WHERE pi.purchase_request_id = pr.id) AS product_items,
         (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                   'id', h.id,
                   'decision', h.decision,
                   'statusBefore', h.status_before,
                   'statusAfter', h.status_after,
                   'justification', h.justification,
                   'signerName', h.signer_name,
                   'userId', hu.id, 'userTitle', hu.title,
                   'userFirstName', hu.first_name, 'userLastName', hu.last_name,
                   'requestComponentId', h.request_component_id,
                   'activityId', ha.id, 'activityCode', ha.code, 'activityName', ha.name,
                   'createdAt', h.created_at)
                 ORDER BY h.created_at)
          FROM purchase_request_history h
          INNER JOIN users hu ON hu.id = h.user_id
          LEFT JOIN request_components hrc ON hrc.id = h.request_component_id
          LEFT JOIN activities ha ON ha.id = hrc.activity_id
          WHERE h.purchase_request_id = pr.id) AS history
       FROM purchase_requests pr
       INNER JOIN users u ON u.id = pr.requested_by
       INNER JOIN departments d ON d.id = u.department_id
       LEFT JOIN providers ap ON ap.id = pr.awarded_provider_id
       LEFT JOIN comparative_charts cc ON cc.purchase_request_id = pr.id
       LEFT JOIN comparative_chart_providers ccp
         ON ccp.comparative_chart_id = cc.id AND ccp.provider_id = cc.awarded_provider_id
       LEFT JOIN providers ccp_prov ON ccp_prov.id = cc.awarded_provider_id
       CROSS JOIN (SELECT ? AS uid) me`,
    };
  }

  private mapRowToView(row: DatabaseInboxRow): PurchaseRequestView {
    return {
      id: row.id,
      parentRequestId: row.parent_request_id ?? null,
      requestNumber: Number(row.request_number),
      segmentNumber: Number(row.segment_number ?? 0),
      folio: row.folio ?? String(row.request_number),
      status: row.status,
      statusGroup: row.status_group,
      purchaseType: row.purchase_type ?? null,
      awardedProvider:
        row.awarded_provider_id && row.awarded_provider_rfc && row.awarded_provider_name
          ? {
              id: Number(row.awarded_provider_id),
              rfc: row.awarded_provider_rfc,
              name: row.awarded_provider_name,
            }
          : null,
      justification: row.justification,
      totalAmountEstimated: Number(row.total_amount_estimated),
      finalSubtotal: Number(row.final_subtotal ?? 0),
      finalIva: Number(row.final_iva ?? 0),
      finalRetentionIva: Number(row.final_retention_iva ?? 0),
      finalRetentionIsr: Number(row.final_retention_isr ?? 0),
      totalAmountFinal: Number(row.total_amount_final),
      comparativeChart:
        row.comparative_chart_id &&
        row.comparative_chart_awarded_provider_name &&
        row.comparative_chart_updated_at
          ? {
              id: row.comparative_chart_id,
              highestScore: Number(row.comparative_chart_highest_score ?? 0),
              totalAmount: Number(row.comparative_chart_total_amount ?? 0),
              awardedProviderName: row.comparative_chart_awarded_provider_name,
              updatedAt: row.comparative_chart_updated_at,
            }
          : null,
      requester: {
        id: row.requester_id,
        title: row.requester_title ?? null,
        firstName: row.requester_first_name,
        lastName: row.requester_last_name,
        email: row.requester_email,
        department: {
          id: Number(row.department_id),
          name: row.department_name,
        },
      },
      isos: this.parseJsonArray(row.isos).map((item) => {
        const i = item as Record<string, unknown>;
        return { id: Number(i.id), name: String(i.name) };
      }),
      components: this.parseComponents(row.components),
      productItems: this.parseProductItems(row.product_items),
      history: this.parseHistory(row.history),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ==========================================
  // Validations & Inserts
  // ==========================================

  private async insertPurchaseRequest(
    tx: Tx,
    request: PurchaseRequest,
  ): Promise<PurchaseRequestID> {
    let rows: Row[];

    try {
      rows = await this.executeOn(
        tx,
        `INSERT INTO purchase_requests
           (requested_by, status, purchase_type, justification,
            total_amount_estimated, total_amount_final)
         VALUES (?, ?, ?, ?, ?, ?)
         RETURNING id`,
        [
          request.requestedBy,
          request.status,
          request.purchaseType,
          request.justification,
          request.totalAmountEstimated,
          request.totalAmountFinal,
        ],
      );
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        const col = foreignKeyColumn(error);
        if (col === 'requested_by') {
          throw new PurchaseRequesterNotFoundError(request.requestedBy);
        }
      }
      throw new PurchaseRequestNotCreatedError();
    }

    const id = rows[0]?.id as PurchaseRequestID | undefined;
    if (!id) throw new PurchaseRequestNotCreatedError();
    return id;
  }

  private async insertPurchaseRequestIsos(
    tx: Tx,
    purchaseRequestId: PurchaseRequestID,
    isoIds: number[],
  ): Promise<void> {
    // Los duplicados ya los rechaza el dominio; que la ISO exista lo garantiza la FK.
    for (const isoId of isoIds) {
      try {
        await this.executeOn(
          tx,
          `INSERT INTO purchase_request_isos (purchase_request_id, iso_id) VALUES (?, ?)`,
          [purchaseRequestId, isoId],
        );
      } catch (error) {
        if (
          isForeignKeyViolation(error) &&
          foreignKeyColumn(error) === 'iso_id'
        ) {
          throw new PurchaseRequestIsosNotFoundError([isoId]);
        }
        throw error;
      }
    }
  }

  // El líder de la fila se fija aquí con el líder activo de la actividad.
  // Si la actividad no tiene líder activo, el SELECT no regresa filas y no se inserta nada.
  private async insertRequestComponent(
    tx: Tx,
    purchaseRequestId: PurchaseRequestID,
    component: RequestComponent,
  ): Promise<void> {
    let result: unknown;

    try {
      result = await this.executeOn(
        tx,
        `INSERT INTO request_components
           (purchase_request_id, component_id, activity_id, funding_source_id,
            estimated_amount, final_amount, leader_id)
         SELECT ?, ?, ?, ?, ?, ?, ua.user_id
         FROM user_activities ua
         INNER JOIN users u ON u.id = ua.user_id AND u.is_active = TRUE
         WHERE ua.activity_id = ?`,
        [
          purchaseRequestId,
          component.componentId,
          component.activityId,
          component.fundingSourceId,
          component.estimatedAmount,
          component.finalAmount,
          component.activityId,
        ],
      );
    } catch (error) {
      if (isDuplicateEntry(error)) {
        throw new DuplicatedRequestComponentError(
          component.componentId,
          component.activityId,
          component.fundingSourceId,
        );
      }
      if (isForeignKeyViolation(error)) {
        switch (foreignKeyConstraint(error)) {
          case 'fk_rc_component':
            throw new ComponentReferenceNotFoundError(
              'component',
              component.componentId,
            );
          case 'fk_rc_activity_component':
            throw new ActivityNotInComponentError(
              component.activityId,
              component.componentId,
            );
          case 'fk_rc_funding_source':
            throw new ComponentReferenceNotFoundError(
              'fundingSource',
              component.fundingSourceId,
            );
        }
      }
      throw error;
    }

    if ((result as { affectedRows: number }).affectedRows === 0) {
      throw new ActivityWithoutLeaderError(component.activityId);
    }
  }

  private async insertProductItem(
    tx: Tx,
    purchaseRequestId: PurchaseRequestID,
    item: {
      budgetItemId: number;
      measurementUnitId: number;
      quantity: number;
      description: string;
      estimatedAmount: number;
      finalAmount: number;
    },
    position: number,
  ): Promise<void> {
    try {
      await this.executeOn(
        tx,
        `INSERT INTO product_items
           (purchase_request_id, budget_item_id, measurement_unit_id,
            quantity, description, estimated_amount, final_amount, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          purchaseRequestId,
          item.budgetItemId,
          item.measurementUnitId,
          item.quantity,
          item.description,
          item.estimatedAmount,
          item.finalAmount,
          position,
        ],
      );
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        const col = foreignKeyColumn(error);
        if (col === 'budget_item_id') {
          throw new ProductReferenceNotFoundError(
            'budgetItem',
            item.budgetItemId,
          );
        }
        if (col === 'measurement_unit_id') {
          throw new ProductReferenceNotFoundError(
            'measurementUnit',
            item.measurementUnitId,
          );
        }
      }
      throw error;
    }
  }

  // ==========================================
  // Hidratación / Parsing JSON
  // ==========================================

  private parseJsonArray(value: unknown): unknown[] {
    if (value === null || value === undefined) return [];
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  }

  private parseIds(value: unknown): number[] {
    return this.parseJsonArray(value).map(Number);
  }

  // Dentro de JSON_OBJECT las fechas llegan como 'YYYY-MM-DD HH:MM:SS' (hora local, igual que el driver).
  private parseJsonDate(value: unknown): Date | null {
    if (typeof value !== 'string') return null;
    return new Date(value.replace(' ', 'T'));
  }

  private parseComponents(value: unknown): PurchaseRequestComponentView[] {
    return this.parseJsonArray(value).map((item) => {
      const c = item as Record<string, unknown>;
      return {
        id: String(c.id),
        component: {
          id: Number(c.componentId),
          code: String(c.componentCode),
          name: String(c.componentName),
        },
        activity: {
          id: Number(c.activityId),
          code: String(c.activityCode),
          name: String(c.activityName),
        },
        administrativeUnit: {
          id: Number(c.administrativeUnitId),
          code: String(c.administrativeUnitCode),
          name: String(c.administrativeUnitName),
        },
        fundingSource: {
          id: Number(c.fundingSourceId),
          code: String(c.fundingSourceCode),
          name: String(c.fundingSourceName),
        },
        estimatedAmount: Number(c.estimatedAmount),
        finalAmount: Number(c.finalAmount),
        leader: {
          id: String(c.leaderId),
          title: typeof c.leaderTitle === 'string' ? c.leaderTitle : null,
          firstName: String(c.leaderFirstName),
          lastName: String(c.leaderLastName),
        },
        leaderStatus: c.leaderStatus as ComponentLeaderStatus,
        leaderDecidedAt: this.parseJsonDate(c.leaderDecidedAt),
      };
    });
  }

  private parseHistory(value: unknown): PurchaseRequestHistoryView[] {
    const asString = (v: unknown): string | null =>
      typeof v === 'string' ? v : null;

    return this.parseJsonArray(value).map((item) => {
      const h = item as Record<string, unknown>;
      return {
        id: String(h.id),
        decision: h.decision as PurchaseRequestHistoryView['decision'],
        statusBefore: h.statusBefore as RequestStatus,
        statusAfter: asString(h.statusAfter) as RequestStatus | null,
        justification: asString(h.justification),
        user: {
          id: String(h.userId),
          title: asString(h.userTitle),
          firstName: String(h.userFirstName),
          lastName: String(h.userLastName),
        },
        signerName: asString(h.signerName),
        requestComponentId: asString(h.requestComponentId),
        activity:
          h.activityId === null || h.activityId === undefined
            ? null
            : {
                id: Number(h.activityId),
                code: String(h.activityCode),
                name: String(h.activityName),
              },
        createdAt: this.parseJsonDate(h.createdAt) as Date,
      };
    });
  }

  private parseProductItems(value: unknown): PurchaseRequestProductItemView[] {
    return this.parseJsonArray(value).map((item) => {
      const p = item as Record<string, unknown>;
      return {
        id: String(p.id),
        budgetItem: {
          id: Number(p.budgetItemId),
          code: String(p.budgetItemCode),
          name: String(p.budgetItemName),
        },
        measurementUnit: {
          id: Number(p.measurementUnitId),
          name: String(p.measurementUnitName),
        },
        quantity: Number(p.quantity),
        description: String(p.description),
        estimatedAmount: Number(p.estimatedAmount),
        finalAmount: Number(p.finalAmount),
      };
    });
  }

  protected toDomain(row: DatabasePurchaseRequestRow): PurchaseRequest {
    return PurchaseRequest.rehydrate(this.toDomainProps(row));
  }

  private toDomainProps(row: DatabasePurchaseRequestRow): PurchaseRequestProps {
    return {
      id: row.id,
      parentRequestId: row.parent_request_id ?? null,
      requestNumber: Number(row.request_number),
      segmentNumber: Number(row.segment_number ?? 0),
      folio: row.folio,
      requestedBy: row.requested_by,
      status: row.status,
      purchaseType: row.purchase_type ?? undefined,
      awardedProviderId: row.awarded_provider_id
        ? Number(row.awarded_provider_id)
        : null,
      isoIds: this.parseIds(row.iso_ids),
      justification: row.justification,
      totalAmountEstimated: Number(row.total_amount_estimated),
      finalSubtotal: Number(row.final_subtotal ?? 0),
      finalIva: Number(row.final_iva ?? 0),
      finalRetentionIva: Number(row.final_retention_iva ?? 0),
      finalRetentionIsr: Number(row.final_retention_isr ?? 0),
      totalAmountFinal: Number(row.total_amount_final),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
