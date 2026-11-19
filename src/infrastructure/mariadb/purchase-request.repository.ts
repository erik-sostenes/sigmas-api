import { Injectable } from '@nestjs/common';
import {
  PurchaseRequest,
  type PurchaseRequestID,
  type PurchaseType,
  type RequestStatus,
} from '../../business/purchase-request.model';
import type {
  ListPurchaseRequestsRepoQuery,
  PaginatedPurchaseRequests,
  PurchaseRequestComponentView,
  PurchaseRequestListItem,
  PurchaseRequestProductItemView,
  PurchaseRequestRepositoryI,
  PurchaseRequestViewer,
} from '../../business/purchase-request.ports';
import {
  ComponentReferenceNotFoundError,
  ProductReferenceNotFoundError,
  PurchaseRequestAlreadyPersistedError,
  PurchaseRequestIsosNotFoundError,
  PurchaseRequestNotCreatedError,
  PurchaseRequesterNotFoundError,
} from '../../business/purchase-request.errors';
import { foreignKeyColumn, isForeignKeyViolation } from './mariadb.errors';
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
      await this.validateIsosExist(tx, request.isoIds);

      const id = await this.insertPurchaseRequest(tx, request);

      await this.insertPurchaseRequestIsos(tx, id, request.isoIds);

      for (const component of request.requestComponents) {
        await this.insertRequestComponent(tx, id, component);
      }

      for (let i = 0; i < request.productItems.length; i++) {
        await this.insertProductItem(tx, id, request.productItems[i], i);
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

  async listPaginated(
    query: ListPurchaseRequestsRepoQuery,
  ): Promise<PaginatedPurchaseRequests> {
    const offset = (query.page - 1) * query.limit;

    let whereScope: string;
    let componentsFilter: string;

    switch (query.scope) {
      case 'all':
        whereScope = '1 = 1';
        componentsFilter = '';
        break;
      case 'requester':
        whereScope = 'pr.requested_by = me.uid';
        componentsFilter = '';
        break;
      case 'leader':
        whereScope = `EXISTS (
          SELECT 1
          FROM request_components rc
          INNER JOIN user_activities ua ON ua.activity_id = rc.activity_id
          WHERE rc.purchase_request_id = pr.id
            AND ua.user_id = me.uid
        )`;
        componentsFilter = `AND EXISTS (
          SELECT 1
          FROM user_activities ua
          WHERE ua.activity_id = rc.activity_id
            AND ua.user_id = me.uid
        )`;
        break;
      default:
        whereScope = `(pr.requested_by = me.uid OR EXISTS (
          SELECT 1
          FROM request_components rc
          INNER JOIN user_activities ua ON ua.activity_id = rc.activity_id
          WHERE rc.purchase_request_id = pr.id
            AND ua.user_id = me.uid
        ))`;
        componentsFilter = `AND (pr.requested_by = me.uid OR EXISTS (
          SELECT 1
          FROM user_activities ua
          WHERE ua.activity_id = rc.activity_id
            AND ua.user_id = me.uid
        ))`;
        break;
    }

    const statusClause = query.status ? 'AND pr.status = ?' : '';
    const baseParams: unknown[] = query.status
      ? [query.userId, query.status]
      : [query.userId];

    const countRows = await this.execute(
      `SELECT COUNT(*) AS total
       FROM purchase_requests pr
       CROSS JOIN (SELECT ? AS uid) me
       WHERE ${whereScope} ${statusClause}`,
      baseParams,
    );

    const total = Number(countRows[0]?.total ?? 0);
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

    const rows = (await this.execute(
      `SELECT pr.id, pr.request_number, pr.requested_by, pr.status, pr.purchase_type,
              pr.justification, pr.total_amount_estimated, pr.total_amount_final,
              pr.created_at, pr.updated_at,
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
                   'finalAmount', rc.final_amount))
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
       CROSS JOIN (SELECT ? AS uid) me
       WHERE ${whereScope} ${statusClause}
       ORDER BY pr.request_number DESC
       LIMIT ? OFFSET ?`,
      [...baseParams, query.limit, offset],
    )) as DatabasePurchaseRequestListRow[];

    const data: PurchaseRequestListItem[] = rows.map((row) => ({
      id: row.id,
      requestNumber: Number(row.request_number),
      requestedBy: row.requested_by,
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
    }));

    return {
      data,
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
  // Validations & Inserts
  // ==========================================

  private async validateIsosExist(tx: Tx, isoIds: number[]): Promise<void> {
    const isoPlaceholders = this.placeholders(isoIds);
    const isoRows = await this.executeOn(
      tx,
      `SELECT id FROM isos WHERE id IN (${isoPlaceholders})`,
      isoIds,
    );

    if (isoRows.length !== isoIds.length) {
      const foundIds = new Set(isoRows.map((r) => Number(r.id)));
      const missing = isoIds.filter((id) => !foundIds.has(id));
      throw new PurchaseRequestIsosNotFoundError(missing);
    }
  }

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
    for (const isoId of isoIds) {
      await this.executeOn(
        tx,
        `INSERT IGNORE INTO purchase_request_isos (purchase_request_id, iso_id) VALUES (?, ?)`,
        [purchaseRequestId, isoId],
      );
    }
  }

  private async insertRequestComponent(
    tx: Tx,
    purchaseRequestId: PurchaseRequestID,
    component: {
      componentId: number;
      activityId: number;
      fundingSourceId: number;
      estimatedAmount: number;
      finalAmount: number;
    },
  ): Promise<void> {
    try {
      await this.executeOn(
        tx,
        `INSERT INTO request_components
           (purchase_request_id, component_id, activity_id, funding_source_id,
            estimated_amount, final_amount)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          purchaseRequestId,
          component.componentId,
          component.activityId,
          component.fundingSourceId,
          component.estimatedAmount,
          component.finalAmount,
        ],
      );
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        const col = foreignKeyColumn(error);
        if (col === 'component_id') {
          throw new ComponentReferenceNotFoundError(
            'component',
            component.componentId,
          );
        }
        if (col === 'activity_id') {
          throw new ComponentReferenceNotFoundError(
            'activity',
            component.activityId,
          );
        }
        if (col === 'funding_source_id') {
          throw new ComponentReferenceNotFoundError(
            'fundingSource',
            component.fundingSourceId,
          );
        }
      }
      throw error;
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
    _index: number,
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
