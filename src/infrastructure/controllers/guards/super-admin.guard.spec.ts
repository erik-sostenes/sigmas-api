import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SuperAdminGuard } from './super-admin.guard';
import { UserRepositoryI } from '../../../business/user.ports';

describe('SuperAdminGuard', () => {
  let hasActiveRoleMock: jest.Mock<Promise<boolean>, [string, string]>;
  let guard: SuperAdminGuard;
  const originalFallback = process.env.ADMIN_CLERK_METADATA_FALLBACK;

  beforeEach(() => {
    delete process.env.ADMIN_CLERK_METADATA_FALLBACK;
    hasActiveRoleMock = jest.fn();
    const userRepository: UserRepositoryI = {
      save: jest.fn(),
      hasActiveRole: hasActiveRoleMock,
    };
    guard = new SuperAdminGuard(userRepository);
  });

  afterAll(() => {
    if (originalFallback === undefined) {
      delete process.env.ADMIN_CLERK_METADATA_FALLBACK;
    } else {
      process.env.ADMIN_CLERK_METADATA_FALLBACK = originalFallback;
    }
  });

  const buildContext = (auth: Record<string, unknown>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ auth }),
      }),
    }) as unknown as ExecutionContext;

  it('permite el acceso cuando el usuario activo tiene el rol admin en MariaDB', async () => {
    hasActiveRoleMock.mockResolvedValue(true);

    const result = await guard.canActivate(
      buildContext({ userId: 'user_admin_1' }),
    );

    expect(result).toBe(true);
    expect(hasActiveRoleMock).toHaveBeenCalledWith('user_admin_1', 'admin');
  });

  it('bloquea el acceso cuando el usuario no tiene el rol admin en MariaDB y el fallback está desactivado', async () => {
    hasActiveRoleMock.mockResolvedValue(false);

    await expect(
      guard.canActivate(
        buildContext({
          userId: 'user_no_admin',
          sessionClaims: { metadata: { role: 'admin' } },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('permite acceso temporal si ADMIN_CLERK_METADATA_FALLBACK=true y Clerk trae rol admin', async () => {
    process.env.ADMIN_CLERK_METADATA_FALLBACK = 'true';
    hasActiveRoleMock.mockResolvedValue(false);

    const result = await guard.canActivate(
      buildContext({
        userId: 'user_legacy_admin',
        sessionClaims: { metadata: { role: 'admin' } },
      }),
    );

    expect(result).toBe(true);
  });
});
