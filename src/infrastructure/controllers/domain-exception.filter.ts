import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  PurchaseRequestDomainError,
  PurchaseRequesterNotFoundError,
  PurchaseRequestNotCreatedError,
  InvalidPurchaseRequestError,
  ProductItemNotFoundError,
  RequestComponentNotFoundError,
} from '../../business/purchase-request.errors';

@Catch(PurchaseRequestDomainError)
export class PurchaseRequestExceptionFilter implements ExceptionFilter {
  catch(error: Error, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const status = this.getHttpStatus(error);

    res.status(status).json({
      statusCode: status,
      error: error.name,
      message: error.message,
    });
  }

  private getHttpStatus(error: Error): number {
    if (
      error instanceof PurchaseRequesterNotFoundError ||
      error instanceof ProductItemNotFoundError ||
      error instanceof RequestComponentNotFoundError
    ) {
      return HttpStatus.UNPROCESSABLE_ENTITY; // 422 (o puedes usar NOT_FOUND 404)
    }

    if (error instanceof PurchaseRequestNotCreatedError) {
      return HttpStatus.INTERNAL_SERVER_ERROR; // 500
    }

    if (error instanceof InvalidPurchaseRequestError) {
      return HttpStatus.BAD_REQUEST; // 400
    }

    return HttpStatus.BAD_REQUEST;
  }
}
