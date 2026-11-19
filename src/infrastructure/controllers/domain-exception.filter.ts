import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ComponentReferenceNotFoundError,
  InvalidPurchaseRequestError,
  IsoNotFoundError,
  ProductItemNotFoundError,
  ProductReferenceNotFoundError,
  PurchaseRequestAccessDeniedError,
  PurchaseRequestDomainError,
  PurchaseRequesterNotFoundError,
  PurchaseRequestIsosNotFoundError,
  PurchaseRequestNotCreatedError,
  PurchaseRequestNotFoundError,
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
    if (error instanceof PurchaseRequestNotFoundError) {
      return HttpStatus.NOT_FOUND;
    }

    if (error instanceof PurchaseRequestAccessDeniedError) {
      return HttpStatus.FORBIDDEN;
    }

    if (
      error instanceof PurchaseRequesterNotFoundError ||
      error instanceof PurchaseRequestIsosNotFoundError ||
      error instanceof IsoNotFoundError ||
      error instanceof ComponentReferenceNotFoundError ||
      error instanceof ProductReferenceNotFoundError ||
      error instanceof ProductItemNotFoundError ||
      error instanceof RequestComponentNotFoundError
    ) {
      return HttpStatus.UNPROCESSABLE_ENTITY;
    }

    if (error instanceof PurchaseRequestNotCreatedError) {
      return HttpStatus.INTERNAL_SERVER_ERROR;
    }

    if (error instanceof InvalidPurchaseRequestError) {
      return HttpStatus.BAD_REQUEST;
    }

    return HttpStatus.BAD_REQUEST;
  }
}
