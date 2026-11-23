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
  StatusGroup,
  StatusGroupCondition,
  SummarizeInboxRepoQuery,
} from '../../business/purchase-request.ports';
import {
  ActivityNotInComponentError,
  ActivityWithoutLeaderError,
  ComponentReferenceNotFoundError,
  DuplicatedRequestComponentError,
  ProductReferenceNotFoundError,
  PurchaseRequestAlreadyPersistedError,
  PurchaseRequestIsosNotFoundError,
  PurchaseRequestNotCreatedError,
  PurchaseRequesterNotFoundError,
} from '../../business/purchase-request.errors';
import { statusGroupOf } from '../../business/purchase-request.stages';
import {
  foreignKeyColumn,
  foreignKeyConstraint,
  isDuplicateEntry,
  isForeignKeyViolation,
} from './mariadb.errors';
import { MariaDBRepository, type Row, type Tx } from './mariadb.repository';

type DatabasePurchaseRequestRow = {
  id: string;
  request_number: number;
  requested_by: string;
  status: RequestStatus;
  purchase_type: PurchaseType | null;
  iso_ids: unknown;
  justification: string;
  total_amount_estimated: string | number;
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

type DatabaseInboxRow = {
  id: string;
  request_number: number;
  status: RequestStatus;
  purchase_type: PurchaseType | null;
  justification: string;
  total_amount_estimated: string | number;
  total_amount_final: string | number;
  created_at: Date;
  updated_at: Date;
  requester_id: string;
  requester_title: string | null;
  requester_first_name: string;
  requester_last_name: string;
  requester_email: string;
  department_id: number;
  department_name: string;
  has_leader_decisions: number | boolean;
  isos: unknown;
  components: unknown;
  product_items: unknown;
  history: unknown;
};

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

    if (query.statusGroup) {
      const group = this.buildStatusGroupSql(query.statusGroup);
      conditions.push(group.sql);
      params.push(...group.params);
    }

    if (query.search) {
      conditions.push('CAST(pr.request_number AS CHAR) LIKE ?');
      params.push(`%${query.search}%`);
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

    const rows = (await this.execute(
      `${this.buildViewSelectSql(visibility.componentsFilter)}
       WHERE ${whereSql}
       ORDER BY pr.request_number DESC
       LIMIT ? OFFSET ?`,
      [query.viewerId, ...params, query.limit, offset],
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

    const rows = (await this.execute(
      `${this.buildViewSelectSql(visibility.componentsFilter)}
       WHERE pr.id = ? AND ${visibility.where}
       LIMIT 1`,
      [query.viewerId, query.id, ...visibility.params],
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

  // ==========================================
  // Query Builders
  // ==========================================

  // Condición booleana sobre pr para una etapa (pestaña): sus estados, más SOLICITADO
  // con o sin alguna fila ya decidida por su líder.
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
      const decided = `EXISTS (
        SELECT 1 FROM request_components drc
        WHERE drc.purchase_request_id = pr.id AND drc.leader_status <> 'PENDIENTE'
      )`;
      parts.push(
        `(pr.status = 'SOLICITADO' AND ${group.solicitado === 'con_decisiones' ? decided : `NOT ${decided}`})`,
      );
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

  // El primer parámetro siempre es el id del usuario (me.uid).
  private buildViewSelectSql(componentsFilter: string): string {
    return `SELECT pr.id, pr.request_number, pr.status, pr.purchase_type,
              pr.justification, pr.total_amount_estimated, pr.total_amount_final,
              pr.created_at, pr.updated_at,
         u.id AS requester_id,
         u.title AS requester_title,
         u.first_name AS requester_first_name,
         u.last_name AS requester_last_name,
         u.email AS requester_email,
         d.id AS department_id,
         d.name AS department_name,
         -- Sobre todas las filas, no solo las visibles: define la etapa (statusGroup).
         EXISTS (SELECT 1 FROM request_components xrc
                 WHERE xrc.purchase_request_id = pr.id
                   AND xrc.leader_status <> 'PENDIENTE') AS has_leader_decisions,
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
       CROSS JOIN (SELECT ? AS uid) me`;
  }

  private mapRowToView(row: DatabaseInboxRow): PurchaseRequestView {
    return {
      id: row.id,
      requestNumber: Number(row.request_number),
      status: row.status,
      statusGroup: statusGroupOf(row.status, Boolean(row.has_leader_decisions)),
      purchaseType: row.purchase_type ?? null,
      justification: row.justification,
      totalAmountEstimated: Number(row.total_amount_estimated),
      totalAmountFinal: Number(row.total_amount_final),
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
      requestNumber: row.request_number,
      requestedBy: row.requested_by,
      status: row.status,
      purchaseType: row.purchase_type ?? undefined,
      isoIds: this.parseIds(row.iso_ids),
      justification: row.justification,
      totalAmountEstimated: Number(row.total_amount_estimated),
      totalAmountFinal: Number(row.total_amount_final),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
