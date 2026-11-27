import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ComparativeChartAlreadyExistsError,
  ComparativeChartDomainError,
  ComparativeChartNotFoundError,
  ComparativeChartProviderInvalidError,
  ComparativeChartReadOnlyError,
  ComparativeChartRequestInvalidError,
  ComparativeChartValidationError,
} from '../../business/comparative-chart.errors';

@Catch(ComparativeChartDomainError)
export class ComparativeChartExceptionFilter implements ExceptionFilter {
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
    if (error instanceof ComparativeChartNotFoundError) {
      return HttpStatus.NOT_FOUND;
    }
    if (
      error instanceof ComparativeChartAlreadyExistsError ||
      error instanceof ComparativeChartReadOnlyError ||
      error instanceof ComparativeChartRequestInvalidError
    ) {
      return HttpStatus.CONFLICT;
    }
    if (error instanceof ComparativeChartProviderInvalidError) {
      return HttpStatus.UNPROCESSABLE_ENTITY;
    }
    if (error instanceof ComparativeChartValidationError) {
      return HttpStatus.BAD_REQUEST;
    }
    return HttpStatus.BAD_REQUEST;
  }
}
