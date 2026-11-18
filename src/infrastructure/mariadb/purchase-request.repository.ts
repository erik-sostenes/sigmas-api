import { Injectable } from '@nestjs/common';
import {
  PurchaseRequest,
  type PurchaseRequestID,
  type PurchaseType,
  type RequestStatus,
} from '../../business/purchase-request.model';
import type { PurchaseRequestRepositoryI } from '../../business/purchase-request.ports';
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

  async search(id: PurchaseRequestID): Promise<PurchaseRequest | null> {
    return await this.searchOne(
      `SELECT pr.*,
         (SELECT JSON_ARRAYAGG(pri.iso_id)
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
         (SELECT JSON_ARRAYAGG(pri.iso_id)
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
  // Hidratación
  // ==========================================

  private parseIds(value: unknown): number[] {
    if (value === null || value === undefined) return [];
    const ids = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(ids) ? ids.map(Number) : [];
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
