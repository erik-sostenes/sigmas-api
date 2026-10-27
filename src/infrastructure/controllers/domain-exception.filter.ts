import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  InvalidPurchaseRequestError,
  PurchaseRequesterNotFoundError,
  PurchaseRequestNotCreatedError,
} from '../../business/purchase-request.errors';

@Catch(
  InvalidPurchaseRequestError,
  PurchaseRequesterNotFoundError,
  PurchaseRequestNotCreatedError,
)
export class PurchaseRequestExceptionFilter implements ExceptionFilter {
  catch(error: Error, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    if (error instanceof InvalidPurchaseRequestError) {
      status = HttpStatus.BAD_REQUEST;
    } else if (error instanceof PurchaseRequesterNotFoundError) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
    }

    res.status(status).json({
      statusCode: status,
      error: error.name,
      message: error.message,
    });
  }
}
