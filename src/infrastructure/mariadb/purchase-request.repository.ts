import { Injectable } from '@nestjs/common';
import {
  PurchaseRequest,
  type PurchaseRequestID,
  type PurchaseType,
  type RequestStatus,
} from '../../business/purchase-request.model';
import type { PurchaseRequestRepositoryI } from '../../business/purchase-request.ports';
import {
  PurchaseRequestNotCreatedError,
  PurchaseRequesterNotFoundError,
} from '../../business/purchase-request.errors';
import { isForeignKeyViolation } from './mariadb.errors';
import { MariaDBRepository, type Row } from './mariadb.repository';

type DatabasePurchaseRequestRow = {
  id: string;
  request_number: number;
  requested_by: string;
  status: RequestStatus;
  purchase_type: PurchaseType;
  iso: string;
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
    let rows: Row[];

    try {
      rows = await this.execute(
        `INSERT INTO purchase_requests
           (requested_by, purchase_type, iso, justification, total_amount_estimated)
         VALUES (?, ?, ?, ?, ?)
         RETURNING id`,
        [
          request.requestedBy,
          request.purchaseType,
          request.iso,
          request.justification,
          request.totalAmountEstimated,
        ],
      );
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new PurchaseRequesterNotFoundError(request.requestedBy);
      }

      console.log(error);
      throw new PurchaseRequestNotCreatedError();
    }

    const id = rows[0]?.id;

    if (!id) {
      throw new PurchaseRequestNotCreatedError();
    }

    return id as PurchaseRequestID;
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

  protected toDomain(row: DatabasePurchaseRequestRow): PurchaseRequest {
    return new PurchaseRequest({
      id: row.id,
      requestNumber: row.request_number,
      requestedBy: row.requested_by,
      status: row.status,
      purchaseType: row.purchase_type,
      iso: row.iso,
      justification: row.justification,
      totalAmountEstimated: Number(row.total_amount_estimated),
      totalAmountFinal: Number(row.total_amount_final),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
