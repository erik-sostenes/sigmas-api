import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ActivityNotInComponentError,
  ActivityWithoutLeaderError,
  ComparativeChartLocksRequestError,
  ComparativeChartRequiredError,
  ComponentReferenceNotFoundError,
  CounterPurchaseIncompleteError,
  InvalidPurchaseRequestError,
  InvalidPurchaseTypeForActionError,
  InvalidStatusTransitionError,
  LeaderRowAlreadyDecidedError,
  ProductItemNotFoundError,
  ProductReferenceNotFoundError,
  ProviderNotFoundOrInactiveError,
  PurchaseRequestDomainError,
  PurchaseRequesterNotFoundError,
  PurchaseRequestIsosNotFoundError,
  PurchaseRequestNotCreatedError,
  PurchaseRequestNotFoundError,
  RequestComponentNotFoundError,
  RequestNotAwaitingLeadersError,
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
      error instanceof PurchaseRequestNotFoundError ||
      error instanceof RequestComponentNotFoundError
    ) {
      return HttpStatus.NOT_FOUND;
    }

    // La acción no aplica en el estado actual (alguien más ya decidió o ya pasó de etapa)
    if (
      error instanceof LeaderRowAlreadyDecidedError ||
      error instanceof RequestNotAwaitingLeadersError ||
      error instanceof InvalidStatusTransitionError ||
      error instanceof ComparativeChartLocksRequestError ||
      error instanceof ComparativeChartRequiredError ||
      error instanceof CounterPurchaseIncompleteError ||
      error instanceof InvalidPurchaseTypeForActionError
    ) {
      return HttpStatus.CONFLICT;
    }

    if (
      error instanceof PurchaseRequesterNotFoundError ||
      error instanceof PurchaseRequestIsosNotFoundError ||
      error instanceof ActivityWithoutLeaderError ||
      error instanceof ActivityNotInComponentError ||
      error instanceof ComponentReferenceNotFoundError ||
      error instanceof ProductReferenceNotFoundError ||
      error instanceof ProductItemNotFoundError ||
      error instanceof ProviderNotFoundOrInactiveError
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
