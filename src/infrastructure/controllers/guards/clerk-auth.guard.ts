import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { verifyToken } from '@clerk/backend';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Token no proporcionado o formato inválido',
      );
    }

    const token = authHeader.split(' ')[1];
    const configuredOrigins = process.env.ORIGINS?.split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
    const authorizedParties =
      configuredOrigins && configuredOrigins.length > 0
        ? configuredOrigins
        : ['http://localhost:5173'];

    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
        authorizedParties,
      });

      request.auth = {
        userId: payload.sub,
        sessionClaims: payload,
      };

      return true;
    } catch (error) {
      console.error('Error al verificar token de Clerk:', error);
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
