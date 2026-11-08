import type { Pool, PoolConnection } from 'mariadb';
import { UserMariaDBRepository } from './user.mariadb.repository';
import { User } from '../../business/user.model';
import {
  ActivityAlreadyHasLeaderError,
  UserActivitiesNotFoundError,
  UserDepartmentNotFoundError,
  UserEmailConflictError,
  UserRolesNotFoundError,
} from '../../business/user.errors';

describe('UserMariaDBRepository (transacciones, conflictos e idempotencia)', () => {
  let mockConn: {
    beginTransaction: jest.Mock;
    execute: jest.Mock;
    commit: jest.Mock;
    rollback: jest.Mock;
    release: jest.Mock;
  };
  let mockPool: {
    getConnection: jest.Mock;
    execute: jest.Mock;
  };
  let repository: UserMariaDBRepository;

  beforeEach(() => {
    mockConn = {
      beginTransaction: jest.fn().mockResolvedValue(undefined),
      execute: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
    };

    mockPool = {
      getConnection: jest
        .fn()
        .mockResolvedValue(mockConn as unknown as PoolConnection),
      execute: jest.fn(),
    };

    repository = new UserMariaDBRepository(mockPool as unknown as Pool);
  });

  it('persiste usuario, roles y actividades en una sola transacción (commit)', async () => {
    mockConn.execute
      // 1. SELECT department
      .mockResolvedValueOnce([{ id: 3 }])
      // 2. SELECT roles
      .mockResolvedValueOnce([
        { id: 1, code: 'solicitante' },
        { id: 2, code: 'lider_actividad' },
      ])
      // 3. SELECT activities FOR UPDATE
      .mockResolvedValueOnce([
        { id: 10, code: 'C1A1', leader_id: null, leader_email: null },
        { id: 11, code: 'C1A2', leader_id: null, leader_email: null },
      ])
      // 4. SELECT existing users FOR UPDATE
      .mockResolvedValueOnce([])
      // 5. INSERT INTO users ... RETURNING id
      .mockResolvedValueOnce([{ id: 'uuid-user-1' }])
      // 6. INSERT IGNORE user_roles (solicitante)
      .mockResolvedValueOnce([])
      // 7. INSERT IGNORE user_roles (lider_actividad)
      .mockResolvedValueOnce([])
      // 8. INSERT INTO user_activities (C1A1)
      .mockResolvedValueOnce([])
      // 9. INSERT INTO user_activities (C1A2)
      .mockResolvedValueOnce([]);

    const user = new User({
      clerkId: 'user_clerk_123',
      firstName: 'Hector',
      lastName: 'Ramirez Olvera',
      email: 'nuevo@itsoeh.edu.mx',
      departmentId: 3,
      title: 'Mtro.',
      roleCodes: ['solicitante', 'lider_actividad'],
      activityCodes: ['C1A1', 'C1A2'],
    });

    const userId = await repository.save(user);

    expect(userId).toBe('uuid-user-1');
    expect(mockConn.beginTransaction).toHaveBeenCalledTimes(1);
    expect(mockConn.commit).toHaveBeenCalledTimes(1);
    expect(mockConn.rollback).not.toHaveBeenCalled();
    expect(mockConn.release).toHaveBeenCalledTimes(1);
  });

  it('hace rollback y lanza ActivityAlreadyHasLeaderError si la actividad ya pertenece a otro líder', async () => {
    mockConn.execute
      // 1. SELECT department
      .mockResolvedValueOnce([{ id: 3 }])
      // 2. SELECT roles
      .mockResolvedValueOnce([{ id: 2, code: 'lider_actividad' }])
      // 3. SELECT activities FOR UPDATE (C1A1 ya tiene otro líder)
      .mockResolvedValueOnce([
        {
          id: 10,
          code: 'C1A1',
          leader_id: 'uuid-otro-lider',
          leader_email: 'otro@itsoeh.edu.mx',
        },
      ])
      // 4. SELECT existing users FOR UPDATE
      .mockResolvedValueOnce([])
      // 5. INSERT INTO users ... RETURNING id
      .mockResolvedValueOnce([{ id: 'uuid-nuevo' }]);

    const user = new User({
      clerkId: 'user_clerk_nuevo',
      firstName: 'Juan',
      lastName: 'Perez',
      email: 'nuevo@itsoeh.edu.mx',
      departmentId: 3,
      title: 'Ing.',
      roleCodes: ['lider_actividad'],
      activityCodes: ['C1A1'],
    });

    await expect(repository.save(user)).rejects.toThrow(
      ActivityAlreadyHasLeaderError,
    );
    expect(mockConn.commit).not.toHaveBeenCalled();
    expect(mockConn.rollback).toHaveBeenCalledTimes(1);
    expect(mockConn.release).toHaveBeenCalledTimes(1);
  });

  it('tolera reintentos del webhook para el mismo clerk_id sin duplicar usuario ni fallar por sus propias actividades', async () => {
    mockConn.execute
      // 1. SELECT department
      .mockResolvedValueOnce([{ id: 3 }])
      // 2. SELECT roles
      .mockResolvedValueOnce([{ id: 2, code: 'lider_actividad' }])
      // 3. SELECT activities FOR UPDATE (ya asignada al mismo uuid-user-1)
      .mockResolvedValueOnce([
        {
          id: 10,
          code: 'C1A1',
          leader_id: 'uuid-user-1',
          leader_email: 'mismo@itsoeh.edu.mx',
        },
      ])
      // 4. SELECT existing users FOR UPDATE (encuentra el mismo clerk_id)
      .mockResolvedValueOnce([
        {
          id: 'uuid-user-1',
          clerk_id: 'user_clerk_123',
          email: 'mismo@itsoeh.edu.mx',
        },
      ])
      // 5. UPDATE users
      .mockResolvedValueOnce([])
      // 6. INSERT IGNORE user_roles
      .mockResolvedValueOnce([])
      // 7. INSERT INTO user_activities
      .mockResolvedValueOnce([]);

    const user = new User({
      clerkId: 'user_clerk_123',
      firstName: 'Juan',
      lastName: 'Perez',
      email: 'mismo@itsoeh.edu.mx',
      departmentId: 3,
      title: 'Ing.',
      roleCodes: ['lider_actividad'],
      activityCodes: ['C1A1'],
    });

    const userId = await repository.save(user);

    expect(userId).toBe('uuid-user-1');
    expect(mockConn.commit).toHaveBeenCalledTimes(1);
    expect(mockConn.rollback).not.toHaveBeenCalled();
  });

  it('hace rollback y lanza UserEmailConflictError si el correo pertenece a otra cuenta de Clerk', async () => {
    mockConn.execute
      // 1. SELECT department
      .mockResolvedValueOnce([{ id: 1 }])
      // 2. SELECT roles
      .mockResolvedValueOnce([{ id: 1, code: 'solicitante' }])
      // 3. SELECT existing users FOR UPDATE (mismo email, distinto clerk_id)
      .mockResolvedValueOnce([
        {
          id: 'uuid-anterior',
          clerk_id: 'placeholder_crojo',
          email: 'crojo@placeholder.edu.mx',
        },
      ]);

    const user = new User({
      clerkId: 'user_clerk_nueva_cuenta',
      firstName: 'Carmen',
      lastName: 'Rojo Monroy',
      email: 'crojo@placeholder.edu.mx',
      departmentId: 1,
      title: 'C.P.',
      roleCodes: ['solicitante'],
      activityCodes: [],
    });

    await expect(repository.save(user)).rejects.toThrow(UserEmailConflictError);
    expect(mockConn.commit).not.toHaveBeenCalled();
    expect(mockConn.rollback).toHaveBeenCalledTimes(1);
  });

  it('hace rollback si algún rol no existe en MariaDB', async () => {
    mockConn.execute
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce([]);

    const user = new User({
      clerkId: 'user_clerk_123',
      firstName: 'Juan',
      lastName: 'Perez',
      email: 'test@itsoeh.edu.mx',
      departmentId: 1,
      title: 'Lic.',
      roleCodes: ['rol_fantasma'],
      activityCodes: [],
    });

    await expect(repository.save(user)).rejects.toThrow(UserRolesNotFoundError);
    expect(mockConn.rollback).toHaveBeenCalledTimes(1);
  });

  it('hace rollback si alguna actividad no existe en MariaDB', async () => {
    mockConn.execute
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce([{ id: 2, code: 'lider_actividad' }])
      .mockResolvedValueOnce([]);

    const user = new User({
      clerkId: 'user_clerk_123',
      firstName: 'Juan',
      lastName: 'Perez',
      email: 'test@itsoeh.edu.mx',
      departmentId: 1,
      title: 'Lic.',
      roleCodes: ['lider_actividad'],
      activityCodes: ['C9A9'],
    });

    await expect(repository.save(user)).rejects.toThrow(
      UserActivitiesNotFoundError,
    );
    expect(mockConn.rollback).toHaveBeenCalledTimes(1);
  });

  it('hace rollback si el departamento no existe o está inactivo', async () => {
    mockConn.execute.mockResolvedValueOnce([]);

    const user = new User({
      clerkId: 'user_clerk_123',
      firstName: 'Juan',
      lastName: 'Perez',
      email: 'test@itsoeh.edu.mx',
      departmentId: 99,
      title: 'Lic.',
      roleCodes: ['solicitante'],
      activityCodes: [],
    });

    await expect(repository.save(user)).rejects.toThrow(
      UserDepartmentNotFoundError,
    );
    expect(mockConn.rollback).toHaveBeenCalledTimes(1);
  });

  it('persiste usuario, roles y actividades usando roleIds y activityIds exclusivamente', async () => {
    mockConn.execute
      // 1. SELECT department
      .mockResolvedValueOnce([{ id: 3 }])
      // 2. SELECT roles by id
      .mockResolvedValueOnce([{ id: 2, code: 'lider_actividad' }])
      // 3. SELECT activities by id FOR UPDATE
      .mockResolvedValueOnce([
        { id: 10, code: 'C1A1', leader_id: null, leader_email: null },
      ])
      // 4. SELECT existing users FOR UPDATE
      .mockResolvedValueOnce([])
      // 5. INSERT INTO users ... RETURNING id
      .mockResolvedValueOnce([{ id: 'uuid-user-ids-only' }])
      // 6. INSERT IGNORE user_roles
      .mockResolvedValueOnce([])
      // 7. INSERT INTO user_activities
      .mockResolvedValueOnce([]);

    const user = new User({
      clerkId: 'user_clerk_ids_only',
      firstName: 'Juan',
      lastName: 'Perez',
      email: 'ids_only@itsoeh.edu.mx',
      departmentId: 3,
      title: 'Mtro.',
      roleIds: [2],
      activityIds: [10],
    });

    const userId = await repository.save(user);

    expect(userId).toBe('uuid-user-ids-only');
    expect(mockConn.beginTransaction).toHaveBeenCalledTimes(1);
    expect(mockConn.commit).toHaveBeenCalledTimes(1);
  });
});

