import { Injectable } from '@nestjs/common';
import {
  PurchaseRequest,
  type PurchaseRequestID,
  type PurchaseType,
  type RequestStatus,
} from '../../business/purchase-request.model';
import type { PurchaseRequestRepositoryI } from '../../business/purchase-request.ports';
import { isForeignKeyViolation } from './mariadb.errors';
import { MariaDBRepository } from './mariadb.repository';
import {
  InvalidPurchaseRequestError,
  PurchaseRequesterNotFoundError,
  PurchaseRequestIsosNotFoundError,
  PurchaseRequestNotCreatedError,
} from '../../business/purchase-request.errors';

type DatabasePurchaseRequestRow = {
  id: string;
  request_number: number;
  requested_by: string;
  status: RequestStatus;
  purchase_type: PurchaseType;
  iso_ids: unknown;
  justification: string;
  total_amount_estimated: string | number; // DECIMAL
  total_amount_final: string | number; // DECIMAL
  created_at: Date;
  updated_at: Date;
};

@Injectable()
export class PurchaseRequestRepository
  extends MariaDBRepository<PurchaseRequest>
  implements PurchaseRequestRepositoryI
{
  async save(request: PurchaseRequest): Promise<PurchaseRequestID> {
    request.validate();

    return this.withTransaction(async (tx) => {
      // 1. Validar que existan todas las ISOs solicitadas
      const isoPlaceholders = this.placeholders(request.isoIds);
      const isoRows = await this.executeOn(
        tx,
        `SELECT id FROM isos WHERE id IN (${isoPlaceholders})`,
        request.isoIds,
      );

      if (isoRows.length !== request.isoIds.length) {
        const foundIds = new Set(isoRows.map((r) => Number(r.id)));
        const missing = request.isoIds.filter((id) => !foundIds.has(id));
        throw new PurchaseRequestIsosNotFoundError(missing);
      }

      // 2. Insertar la solicitud de compra
      const rows = await this.executeOn(
        tx,
        `INSERT INTO purchase_requests
           (requested_by, purchase_type, justification, total_amount_estimated)
         VALUES (?, ?, ?, ?)
         RETURNING id`,
        [
          request.requestedBy,
          request.purchaseType,
          request.justification,
          request.totalAmountEstimated,
        ],
      );

      const id = rows[0]?.id as PurchaseRequestID | undefined;
      if (!id) {
        throw new PurchaseRequestNotCreatedError();
      }

      // 3. Insertar relación purchase_request_isos (igual que user_roles)
      for (const isoId of request.isoIds) {
        await this.executeOn(
          tx,
          `INSERT IGNORE INTO purchase_request_isos (purchase_request_id, iso_id) VALUES (?, ?)`,
          [id, isoId],
        );
      }

      return id;
    }).catch((error) => {
      if (
        error instanceof InvalidPurchaseRequestError ||
        error instanceof PurchaseRequestIsosNotFoundError ||
        error instanceof PurchaseRequestNotCreatedError
      ) {
        throw error;
      }

      if (isForeignKeyViolation(error)) {
        throw new PurchaseRequesterNotFoundError(request.requestedBy);
      }

      console.log(error);
      throw new PurchaseRequestNotCreatedError();
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

  private parseIds(value: unknown): number[] {
    if (value === null || value === undefined) return [];
    const ids = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(ids) ? ids.map(Number) : [];
  }

  protected toDomain(row: DatabasePurchaseRequestRow): PurchaseRequest {
    return new PurchaseRequest({
      id: row.id,
      requestNumber: row.request_number,
      requestedBy: row.requested_by,
      status: row.status,
      purchaseType: row.purchase_type,
      isoIds: this.parseIds(row.iso_ids),
      justification: row.justification,
      totalAmountEstimated: Number(row.total_amount_estimated),
      totalAmountFinal: Number(row.total_amount_final),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
