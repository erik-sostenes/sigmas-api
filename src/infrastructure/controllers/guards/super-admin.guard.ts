import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { UserRepositoryI } from '../../../business/user.ports';
import { ADMIN_ROLE_CODE } from '../../../business/user-assignment.model';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  private readonly logger = new Logger(SuperAdminGuard.name);

  constructor(private readonly userRepository: UserRepositoryI) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const clerkId: string | undefined = request.auth?.userId;

    if (!clerkId) {
      throw new ForbiddenException(
        'Solo un administrador puede realizar esta acción',
      );
    }

    const isDbAdmin = await this.userRepository.hasActiveRole(
      clerkId,
      ADMIN_ROLE_CODE,
    );

    if (isDbAdmin) {
      return true;
    }

    if (process.env.ADMIN_CLERK_METADATA_FALLBACK === 'true') {
      const claims = request.auth?.sessionClaims ?? {};
      const metadata =
        claims.metadata ?? claims.publicMetadata ?? claims.public_metadata;

      const hasClerkAdmin =
        metadata?.role === ADMIN_ROLE_CODE ||
        (Array.isArray(metadata?.roleCodes) &&
          metadata.roleCodes.includes(ADMIN_ROLE_CODE)) ||
        (Array.isArray(metadata?.roles) &&
          metadata.roles.includes(ADMIN_ROLE_CODE));

      if (hasClerkAdmin) {
        this.logger.warn(
          `Usuario ${clerkId} autorizado mediante ADMIN_CLERK_METADATA_FALLBACK. Regístralo en MariaDB con el rol '${ADMIN_ROLE_CODE}' y desactiva el fallback.`,
        );
        return true;
      }
    }

    throw new ForbiddenException(
      'Solo un administrador puede realizar esta acción',
    );
  }
}

export { SuperAdminGuard as AdminGuard };
