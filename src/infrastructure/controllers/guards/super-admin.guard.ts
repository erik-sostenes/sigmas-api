import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const metadata = request.auth?.sessionClaims?.metadata;
    const userRole = metadata?.rol || metadata?.role;

    if (userRole !== 'super_admin') {
      throw new ForbiddenException(
        'Solo un Super Admin puede realizar esta acción',
      );
    }

    return true;
  }
}
