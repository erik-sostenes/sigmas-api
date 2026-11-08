import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ClerkInvitationError,
  InvalidInvitationActivitiesRoleError,
  InvalidInvitationError,
  InvitationActivitiesNotFoundError,
  InvitationActivityAlreadyHasLeaderError,
  InvitationDepartmentNotFoundError,
  InvitationRoleIdsNotFoundError,
  InvitationRolesNotFoundError,
  InvitationUserAlreadyExistsError,
  LeaderInvitationRequiresActivitiesError,
} from '../../business/invitation.errors';

@Catch(
  InvalidInvitationError,
  InvitationUserAlreadyExistsError,
  InvitationDepartmentNotFoundError,
  InvitationRoleIdsNotFoundError,
  InvitationRolesNotFoundError,
  InvitationActivitiesNotFoundError,
  InvalidInvitationActivitiesRoleError,
  LeaderInvitationRequiresActivitiesError,
  InvitationActivityAlreadyHasLeaderError,
  ClerkInvitationError,
)
export class InvitationExceptionFilter implements ExceptionFilter {
  catch(error: Error, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    if (error instanceof InvalidInvitationError) {
      status = HttpStatus.BAD_REQUEST;
    } else if (
      error instanceof InvitationUserAlreadyExistsError ||
      error instanceof InvitationActivityAlreadyHasLeaderError
    ) {
      status = HttpStatus.CONFLICT;
    } else if (
      error instanceof InvitationDepartmentNotFoundError ||
      error instanceof InvitationRoleIdsNotFoundError ||
      error instanceof InvitationRolesNotFoundError ||
      error instanceof InvitationActivitiesNotFoundError ||
      error instanceof InvalidInvitationActivitiesRoleError ||
      error instanceof LeaderInvitationRequiresActivitiesError
    ) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
    } else if (error instanceof ClerkInvitationError) {
      status = HttpStatus.BAD_GATEWAY;
    }

    res.status(status).json({
      statusCode: status,
      error: error.name,
      message: error.message,
    });
  }
}

