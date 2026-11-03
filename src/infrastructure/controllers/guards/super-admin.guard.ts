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

    if (metadata?.role !== 'admin') {
      throw new ForbiddenException(
        'Solo un Super Admin puede realizar esta acción',
      );
    }

    return true;
  }
}
