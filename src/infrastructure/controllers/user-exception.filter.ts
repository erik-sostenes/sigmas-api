import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ActivityAlreadyHasLeaderError,
  InvalidUserActivitiesRoleError,
  InvalidUserAssignmentError,
  LeaderUserRequiresActivitiesError,
  UserActivitiesNotFoundError,
  UserAlreadyExistsError,
  UserDepartmentNotFoundError,
  UserEmailConflictError,
  UserNotCreatedError,
  UserRolesNotFoundError,
} from '../../business/user.errors';

@Catch(
  UserAlreadyExistsError,
  UserEmailConflictError,
  UserDepartmentNotFoundError,
  UserRolesNotFoundError,
  UserActivitiesNotFoundError,
  InvalidUserAssignmentError,
  InvalidUserActivitiesRoleError,
  LeaderUserRequiresActivitiesError,
  ActivityAlreadyHasLeaderError,
  UserNotCreatedError,
)
export class UserExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(UserExceptionFilter.name);

  catch(error: Error, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (error instanceof UserAlreadyExistsError) {
      res.status(HttpStatus.OK).json({
        success: true,
        message: 'El usuario ya existe. Evento procesado idempotentemente.',
      });
      return;
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    if (
      error instanceof ActivityAlreadyHasLeaderError ||
      error instanceof UserEmailConflictError
    ) {
      status = HttpStatus.CONFLICT;
    } else if (
      error instanceof UserDepartmentNotFoundError ||
      error instanceof UserRolesNotFoundError ||
      error instanceof UserActivitiesNotFoundError ||
      error instanceof InvalidUserAssignmentError ||
      error instanceof InvalidUserActivitiesRoleError ||
      error instanceof LeaderUserRequiresActivitiesError
    ) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
    }

    this.logger.warn(`[${error.name}] ${error.message}`);

    res.status(status).json({
      statusCode: status,
      error: error.name,
      message: error.message,
    });
  }
}
