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
  IsoNotFoundError,
  ProductReferenceNotFoundError,
  PurchaseRequestAlreadyPersistedError,
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
  iso_id: number;
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
      const id = await this.insertPurchaseRequest(tx, request);

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
      `SELECT * FROM purchase_requests WHERE id = ?`,
      [id],
    );
  }

  async searchAll(): Promise<PurchaseRequest[]> {
    return await this.searchMany(
      `SELECT * FROM purchase_requests ORDER BY request_number DESC`,
    );
  }

  // ==========================================
  // Inserts
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
           (requested_by, status, purchase_type, iso_id, justification,
            total_amount_estimated, total_amount_final)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         RETURNING id`,
        [
          request.requestedBy,
          request.status,
          request.purchaseType,
          request.isoId,
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
        if (col === 'iso_id') {
          throw new IsoNotFoundError(request.isoId);
        }
      }
      throw new PurchaseRequestNotCreatedError();
    }

    const id = rows[0]?.id as PurchaseRequestID | undefined;
    if (!id) throw new PurchaseRequestNotCreatedError();
    return id;
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

  protected toDomain(row: DatabasePurchaseRequestRow): PurchaseRequest {
    return PurchaseRequest.rehydrate({
      id: row.id,
      requestNumber: row.request_number,
      requestedBy: row.requested_by,
      status: row.status,
      purchaseType: row.purchase_type ?? undefined,
      isoId: Number(row.iso_id),
      justification: row.justification,
      totalAmountEstimated: Number(row.total_amount_estimated),
      totalAmountFinal: Number(row.total_amount_final),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
