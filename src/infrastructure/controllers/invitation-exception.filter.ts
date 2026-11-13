import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  InvalidInvitationError,
  InvitationUserAlreadyExistsError,
  InvitationAlreadyPendingError,
  InvitationDepartmentNotFoundError,
  InvitationComponentNotFoundError,
  InvitationComponentAlreadyHasLeaderError,
  InvitationRoleIdsNotFoundError,
  InvitationActivitiesNotFoundError,
  InvalidInvitationActivitiesRoleError,
  InvitationRequiresActivitiesError,
  InvitationComponentRoleMismatchError,
  InvitationActivityAlreadyHasLeaderError,
  InvitationNotFoundError,
  ClerkInvitationError,
} from '../../business/invitation.errors';

@Catch(
  InvalidInvitationError,
  InvitationUserAlreadyExistsError,
  InvitationAlreadyPendingError,
  InvitationDepartmentNotFoundError,
  InvitationComponentNotFoundError,
  InvitationComponentAlreadyHasLeaderError,
  InvitationRoleIdsNotFoundError,
  InvitationActivitiesNotFoundError,
  InvalidInvitationActivitiesRoleError,
  InvitationRequiresActivitiesError,
  InvitationComponentRoleMismatchError,
  InvitationActivityAlreadyHasLeaderError,
  InvitationNotFoundError,
  ClerkInvitationError,
)
export class InvitationExceptionFilter implements ExceptionFilter {
  catch(error: Error, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    // 400 - Bad Request (Errores de validación de datos)
    if (error instanceof InvalidInvitationError) {
      status = HttpStatus.BAD_REQUEST;
    }
    // 404 - Not Found (Recursos que se buscan por ID y no existen)
    else if (error instanceof InvitationNotFoundError) {
      status = HttpStatus.NOT_FOUND;
    }
    // 409 - Conflict (Duplicados o Puestos ya ocupados)
    else if (
      error instanceof InvitationUserAlreadyExistsError ||
      error instanceof InvitationAlreadyPendingError ||
      error instanceof InvitationComponentAlreadyHasLeaderError ||
      error instanceof InvitationActivityAlreadyHasLeaderError
    ) {
      status = HttpStatus.CONFLICT;
    }
    // 422 - Unprocessable Entity (Reglas de negocio rotas o FKs inexistentes)
    else if (
      error instanceof InvitationDepartmentNotFoundError ||
      error instanceof InvitationComponentNotFoundError ||
      error instanceof InvitationRoleIdsNotFoundError ||
      error instanceof InvitationActivitiesNotFoundError ||
      error instanceof InvalidInvitationActivitiesRoleError ||
      error instanceof InvitationRequiresActivitiesError ||
      error instanceof InvitationComponentRoleMismatchError
    ) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
    }
    // 502 - Bad Gateway (Fallo al comunicarse con Clerk)
    else if (error instanceof ClerkInvitationError) {
      status = HttpStatus.BAD_GATEWAY;
    }

    res.status(status).json({
      statusCode: status,
      error: error.name,
      message: error.message,
    });
  }
}
