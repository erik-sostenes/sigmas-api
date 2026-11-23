import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RoleCode } from '../../../business/role-codes';
import type { Viewer } from '../../../business/viewer.model';
import { ViewerRepositoryI } from '../../../business/viewer.ports';

const REQUIRED_ROLE_KEY = 'requiredRole';

// Rol que necesita la ruta (o el controller completo) para entrar.
export const RequireRole = (role: RoleCode) =>
  SetMetadata(REQUIRED_ROLE_KEY, role);

// Inyecta el Viewer que dejó RolesGuard en la request.
export const CurrentViewer = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Viewer =>
    context.switchToHttp().getRequest().viewer,
);

// Va después de ClerkAuthGuard: @UseGuards(ClerkAuthGuard, RolesGuard).
// Los roles se validan contra la BD, no contra la metadata del token.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly viewerRepository: ViewerRepositoryI,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const viewer = await this.viewerRepository.findActiveByClerkId(
      request.auth.userId,
    );
    if (!viewer) {
      throw new ForbiddenException(
        'Usuario no registrado o inactivo en el sistema.',
      );
    }

    const requiredRole = this.reflector.getAllAndOverride<
      RoleCode | undefined
    >(REQUIRED_ROLE_KEY, [context.getHandler(), context.getClass()]);

    if (requiredRole && !viewer.roleCodes.includes(requiredRole)) {
      throw new ForbiddenException(
        'No tienes el rol necesario para esta sección.',
      );
    }

    request.viewer = viewer;
    return true;
  }
}
