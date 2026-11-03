import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  UserAlreadyExistsError,
  UserDepartmentNotFoundError,
  UserNotCreatedError,
} from '../../business/user.errors';

@Catch(UserAlreadyExistsError, UserDepartmentNotFoundError, UserNotCreatedError)
export class UserExceptionFilter implements ExceptionFilter {
  catch(error: Error, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    if (error instanceof UserAlreadyExistsError) {
      res.status(HttpStatus.OK).json({
        success: true,
        message: 'El usuario ya existe. Evento procesado idempotentemente.',
      });
      return;
    }

    if (error instanceof UserDepartmentNotFoundError) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
    }

    res.status(status).json({
      statusCode: status,
      error: error.name,
      message: error.message,
    });
  }
}
