import { Injectable } from '@nestjs/common';
import {
  PurchaseRequest,
  type PurchaseRequestID,
  type PurchaseType,
  type RequestStatus,
} from '../../business/purchase-request.model';
import type {
  ComponentLeaderStatus,
  RequestComponent,
} from '../../business/request-component.model';
import type {
  FindPurchaseRequestDetailRepoQuery,
  ListPurchaseRequestsRepoQuery,
  PaginatedPurchaseRequests,
  PurchaseRequestComponentView,
  PurchaseRequestListItem,
  PurchaseRequestProductItemView,
  PurchaseRequestRepositoryI,
  PurchaseRequestScope,
  PurchaseRequestViewer,
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

type DatabasePurchaseRequestListRow = DatabasePurchaseRequestRow & {
  requester_title: string | null;
  requester_first_name: string;
  requester_last_name: string;
  requester_email: string;
  department_name: string;
  is_requester: number | boolean;
  components: unknown;
  product_items: unknown;
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

      for (const item of request.productItems) {
        await this.insertProductItem(tx, id, item);
      }

      return id;
    });
  }

  async findViewerByClerkId(
    clerkId: string,
  ): Promise<PurchaseRequestViewer | null> {
    const rows = await this.execute(
      `SELECT u.id AS user_id,
         (SELECT JSON_ARRAYAGG(r.code)
          FROM user_roles ur
          INNER JOIN roles r ON r.id = ur.role_id
          WHERE ur.user_id = u.id) AS role_codes
       FROM users u
       WHERE u.clerk_id = ? AND u.is_active = TRUE
       LIMIT 1`,
      [clerkId],
    );

    const row = rows[0];
    if (!row) return null;

    return {
      userId: String(row.user_id),
      roleCodes: this.parseStringArray(row.role_codes),
    };
  }

  async existsById(id: PurchaseRequestID): Promise<boolean> {
    const rows = await this.execute(
      `SELECT 1 FROM purchase_requests WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows.length > 0;
  }

  async findDetailById(
    query: FindPurchaseRequestDetailRepoQuery,
  ): Promise<PurchaseRequestListItem | null> {
    const { whereScope, componentsFilter } = this.buildScopeFilter(query.scope);

    const rows = (await this.execute(
      `${this.buildDetailSelectSql(componentsFilter)}
       WHERE pr.id = ?
         AND ${whereScope}
       LIMIT 1`,
      [query.userId, query.id],
    )) as DatabasePurchaseRequestListRow[];

    const row = rows[0];
    return row ? this.mapRowToListItem(row) : null;
  }

  async listPaginated(
    query: ListPurchaseRequestsRepoQuery,
  ): Promise<PaginatedPurchaseRequests> {
    const offset = (query.page - 1) * query.limit;
    const { whereScope, componentsFilter } = this.buildScopeFilter(query.scope);

    const extraConditions: string[] = [];
    const baseParams: unknown[] = [query.userId];

    if (query.status) {
      extraConditions.push('AND pr.status = ?');
      baseParams.push(query.status);
    }

    if (query.search) {
      extraConditions.push('AND CAST(pr.request_number AS CHAR) LIKE ?');
      baseParams.push(`%${query.search}%`);
    }

    const extraSql = extraConditions.join(' ');

    const countRows = await this.execute(
      `SELECT COUNT(*) AS total
       FROM purchase_requests pr
       CROSS JOIN (SELECT ? AS uid) me
       WHERE ${whereScope} ${extraSql}`,
      baseParams,
    );

    const total = Number(countRows[0]?.total ?? 0);
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

    const rows = (await this.execute(
      `${this.buildDetailSelectSql(componentsFilter)}
       WHERE ${whereScope} ${extraSql}
       ORDER BY pr.request_number DESC
       LIMIT ? OFFSET ?`,
      [...baseParams, query.limit, offset],
    )) as DatabasePurchaseRequestListRow[];

    return {
      data: rows.map((row) => this.mapRowToListItem(row)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    };
  }

  async search(id: PurchaseRequestID): Promise<PurchaseRequest | null> {
    return await this.searchOne(
      `SELECT pr.*,
         (SELECT JSON_ARRAYAGG(pri.iso_id ORDER BY pri.iso_id)
          FROM purchase_request_isos pri
          WHERE pri.purchase_request_id = pr.id) AS iso_ids
       FROM purchase_requests pr
       WHERE pr.id = ?
       LIMIT 1`,
      [id],
    );
  }

  async searchAll(): Promise<PurchaseRequest[]> {
    return await this.searchMany(
      `SELECT pr.*,
         (SELECT JSON_ARRAYAGG(pri.iso_id ORDER BY pri.iso_id)
          FROM purchase_request_isos pri
          WHERE pri.purchase_request_id = pr.id) AS iso_ids
       FROM purchase_requests pr
       ORDER BY pr.request_number DESC`,
    );
  }

  // ==========================================
  // Query Builders
  // ==========================================

  private buildScopeFilter(scope?: PurchaseRequestScope): {
    whereScope: string;
    componentsFilter: string;
  } {
    // ACTIVO (Primera entrega): Filtros por vista activa y visibilidad por rol.
    // FUTURO (Fase 2 - Aprobación multi-líder): Agregar aquí filtro opcional por rc.leader_status (ej. PENDIENTE).
    // FUTURO (Escalabilidad): Si purchase_requests crece a miles de filas, reescribir el scope combinado (default) con UNION en lugar de OR EXISTS.
    switch (scope) {
      case 'all':
        return {
          whereScope: '1 = 1',
          componentsFilter: '',
        };
      case 'requester':
        return {
          whereScope: 'pr.requested_by = me.uid',
          componentsFilter: '',
        };
      case 'leader':
        return {
          whereScope: `EXISTS (
            SELECT 1
            FROM request_components rc
            INNER JOIN user_activities ua ON ua.activity_id = rc.activity_id
            WHERE rc.purchase_request_id = pr.id
              AND ua.user_id = me.uid
          )`,
          componentsFilter: `AND EXISTS (
            SELECT 1
            FROM user_activities ua
            WHERE ua.activity_id = rc.activity_id
              AND ua.user_id = me.uid
          )`,
        };
      default:
        return {
          whereScope: `(pr.requested_by = me.uid OR EXISTS (
            SELECT 1
            FROM request_components rc
            INNER JOIN user_activities ua ON ua.activity_id = rc.activity_id
            WHERE rc.purchase_request_id = pr.id
              AND ua.user_id = me.uid
          ))`,
          componentsFilter: `AND (pr.requested_by = me.uid OR EXISTS (
            SELECT 1
            FROM user_activities ua
            WHERE ua.activity_id = rc.activity_id
              AND ua.user_id = me.uid
          ))`,
        };
    }
  }

  private buildDetailSelectSql(componentsFilter: string): string {
    return `SELECT pr.id, pr.request_number, pr.requested_by, pr.status, pr.purchase_type,
              pr.justification, pr.total_amount_estimated, pr.total_amount_final,
              pr.created_at, pr.updated_at,
         u.title AS requester_title,
         u.first_name AS requester_first_name,
         u.last_name AS requester_last_name,
         u.email AS requester_email,
         d.name AS department_name,
         (pr.requested_by = me.uid) AS is_requester,
         (SELECT JSON_ARRAYAGG(pri.iso_id ORDER BY pri.iso_id)
          FROM purchase_request_isos pri
          WHERE pri.purchase_request_id = pr.id) AS iso_ids,
         (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                   'id', rc.id,
                   'componentId', rc.component_id,
                   'activityId', rc.activity_id,
                   'fundingSourceId', rc.funding_source_id,
                   'estimatedAmount', rc.estimated_amount,
                   'finalAmount', rc.final_amount,
                   'leaderStatus', rc.leader_status))
          FROM request_components rc
          WHERE rc.purchase_request_id = pr.id
            ${componentsFilter}) AS components,
         (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                   'id', pi.id,
                   'budgetItemId', pi.budget_item_id,
                   'measurementUnitId', pi.measurement_unit_id,
                   'quantity', pi.quantity,
                   'description', pi.description,
                   'estimatedAmount', pi.estimated_amount,
                   'finalAmount', pi.final_amount))
          FROM product_items pi
          WHERE pi.purchase_request_id = pr.id) AS product_items
       FROM purchase_requests pr
       INNER JOIN users u ON u.id = pr.requested_by
       INNER JOIN departments d ON d.id = u.department_id
       CROSS JOIN (SELECT ? AS uid) me`;
  }

  private mapRowToListItem(
    row: DatabasePurchaseRequestListRow,
  ): PurchaseRequestListItem {
    return {
      id: row.id,
      requestNumber: Number(row.request_number),
      requestedBy: row.requested_by,
      requester: {
        id: row.requested_by,
        title: row.requester_title ?? null,
        firstName: row.requester_first_name,
        lastName: row.requester_last_name,
        email: row.requester_email,
        departmentName: row.department_name,
      },
      status: row.status,
      purchaseType: row.purchase_type ?? null,
      justification: row.justification,
      totalAmountEstimated: Number(row.total_amount_estimated),
      totalAmountFinal: Number(row.total_amount_final),
      isoIds: this.parseIds(row.iso_ids),
      components: this.parseComponents(row.components),
      productItems: this.parseProductItems(row.product_items),
      isRequester: Boolean(row.is_requester),
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
  ): Promise<void> {
    try {
      await this.executeOn(
        tx,
        `INSERT INTO product_items
           (purchase_request_id, budget_item_id, measurement_unit_id,
            quantity, description, estimated_amount, final_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          purchaseRequestId,
          item.budgetItemId,
          item.measurementUnitId,
          item.quantity,
          item.description,
          item.estimatedAmount,
          item.finalAmount,
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

  private parseStringArray(value: unknown): string[] {
    return this.parseJsonArray(value).map(String);
  }

  private parseComponents(value: unknown): PurchaseRequestComponentView[] {
    return this.parseJsonArray(value).map((item) => {
      const c = item as Record<string, unknown>;
      return {
        id: String(c.id),
        componentId: Number(c.componentId),
        activityId: Number(c.activityId),
        fundingSourceId: Number(c.fundingSourceId),
        estimatedAmount: Number(c.estimatedAmount),
        finalAmount: Number(c.finalAmount),
        leaderStatus: c.leaderStatus as ComponentLeaderStatus,
      };
    });
  }

  private parseProductItems(value: unknown): PurchaseRequestProductItemView[] {
    return this.parseJsonArray(value).map((item) => {
      const p = item as Record<string, unknown>;
      return {
        id: String(p.id),
        budgetItemId: Number(p.budgetItemId),
        measurementUnitId: Number(p.measurementUnitId),
        quantity: Number(p.quantity),
        description: String(p.description),
        estimatedAmount: Number(p.estimatedAmount),
        finalAmount: Number(p.finalAmount),
      };
    });
  }

  protected toDomain(row: DatabasePurchaseRequestRow): PurchaseRequest {
    return PurchaseRequest.rehydrate({
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
    });
  }
}
