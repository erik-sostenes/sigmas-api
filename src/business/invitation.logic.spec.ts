import { InvitationLogic } from './invitation.logic';
import { Invitation } from './invitation.model';
import {
  InvitationActivityCheckItem,
  InvitationCatalogRepositoryI,
  InvitationRepositoryI,
  RoleLookupItem,
} from './invitation.ports';
import {
  InvalidInvitationActivitiesRoleError,
  InvalidInvitationError,
  InvitationActivitiesNotFoundError,
  InvitationActivityAlreadyHasLeaderError,
  InvitationDepartmentNotFoundError,
  InvitationRoleIdsNotFoundError,
  InvitationRolesNotFoundError,
  InvitationUserAlreadyExistsError,
  LeaderInvitationRequiresActivitiesError,
} from './invitation.errors';

describe('InvitationLogic', () => {
  let sendClerkInvitationMock: jest.Mock<Promise<void>, [Invitation]>;
  let existsActiveDepartmentMock: jest.Mock<Promise<boolean>, [number]>;
  let existsUserByEmailMock: jest.Mock<Promise<boolean>, [string]>;
  let findExistingRoleCodesMock: jest.Mock<Promise<string[]>, [string[]]>;
  let findRolesByIdsMock: jest.Mock<Promise<RoleLookupItem[]>, [number[]]>;
  let findRolesByCodesMock: jest.Mock<Promise<RoleLookupItem[]>, [string[]]>;
  let findActivitiesByCodesMock: jest.Mock<
    Promise<InvitationActivityCheckItem[]>,
    [string[]]
  >;
  let findActivitiesByIdsMock: jest.Mock<
    Promise<InvitationActivityCheckItem[]>,
    [number[]]
  >;
  let logic: InvitationLogic;

  beforeEach(() => {
    sendClerkInvitationMock = jest.fn().mockResolvedValue(undefined);
    existsActiveDepartmentMock = jest.fn().mockResolvedValue(true);
    existsUserByEmailMock = jest.fn().mockResolvedValue(false);
    findExistingRoleCodesMock = jest
      .fn()
      .mockImplementation(async (codes: string[]) => codes);
    findRolesByIdsMock = jest
      .fn()
      .mockImplementation(async (ids: number[]) =>
        ids.map((id) => ({
          id,
          code: id === 2 ? 'lider_actividad' : 'solicitante',
        })),
      );
    findRolesByCodesMock = jest
      .fn()
      .mockImplementation(async (codes: string[]) =>
        codes.map((code, idx) => ({ id: idx + 1, code })),
      );
    findActivitiesByCodesMock = jest
      .fn()
      .mockImplementation(async (codes: string[]) =>
        codes.map((code, idx) => ({
          id: idx + 1,
          code,
          leaderId: null,
          leaderEmail: null,
        })),
      );
    findActivitiesByIdsMock = jest
      .fn()
      .mockImplementation(async (ids: number[]) =>
        ids.map((id) => ({
          id,
          code: `C1A${id}`,
          leaderId: null,
          leaderEmail: null,
        })),
      );

    const invitationRepository: InvitationRepositoryI = {
      sendClerkInvitation: sendClerkInvitationMock,
    };
    const catalogRepository: InvitationCatalogRepositoryI = {
      existsActiveDepartment: existsActiveDepartmentMock,
      existsUserByEmail: existsUserByEmailMock,
      findExistingRoleCodes: findExistingRoleCodesMock,
      findRolesByIds: findRolesByIdsMock,
      findRolesByCodes: findRolesByCodesMock,
      findActivitiesByCodes: findActivitiesByCodesMock,
      findActivitiesByIds: findActivitiesByIdsMock,
    };

    logic = new InvitationLogic(invitationRepository, catalogRepository);
  });

  it('envía invitación usando roleIds y enriquece roleCodes automáticamente', async () => {
    const invitation = new Invitation({
      email: 'lider@itsoeh.edu.mx',
      firstName: 'Hector',
      lastName: 'Ramirez Olvera',
      departmentId: 2,
      title: 'Ing.',
      roleIds: [1, 2],
      activityCodes: ['C1A1'],
    });

    await logic.send(invitation);

    expect(findRolesByIdsMock).toHaveBeenCalledWith([1, 2]);
    expect(invitation.roleCodes).toEqual(['solicitante', 'lider_actividad']);
    expect(sendClerkInvitationMock).toHaveBeenCalledWith(invitation);
  });

  it('rechaza si alguno de los roleIds no existe', async () => {
    findRolesByIdsMock.mockResolvedValue([{ id: 1, code: 'solicitante' }]);

    const invitation = new Invitation({
      email: 'usuario@itsoeh.edu.mx',
      firstName: 'Juan',
      lastName: 'Perez',
      departmentId: 1,
      title: 'Lic.',
      roleIds: [1, 999],
    });

    await expect(logic.send(invitation)).rejects.toThrow(
      InvitationRoleIdsNotFoundError,
    );
    expect(sendClerkInvitationMock).not.toHaveBeenCalled();
  });

  it('envía invitación para un solicitante que NO es líder de actividad (sin actividades)', async () => {
    const invitation = new Invitation({
      email: 'Ana.Torres@itsoeh.edu.mx ',
      firstName: 'Ana',
      lastName: 'Torres',
      departmentId: 3,
      title: ' Mtra. ',
      roleCodes: ['solicitante'],
      activityCodes: [],
    });

    await logic.send(invitation);

    expect(existsUserByEmailMock).toHaveBeenCalledWith(
      'ana.torres@itsoeh.edu.mx',
    );
    expect(existsActiveDepartmentMock).toHaveBeenCalledWith(3);
    expect(findRolesByCodesMock).toHaveBeenCalledWith(['solicitante']);
    expect(findActivitiesByCodesMock).not.toHaveBeenCalled();
    expect(sendClerkInvitationMock).toHaveBeenCalledWith(invitation);
  });

  it('envía invitación para usuario con múltiples roles incluyendo lider_actividad y sus actividades libres', async () => {
    const invitation = new Invitation({
      email: 'lider@itsoeh.edu.mx',
      firstName: 'Hector',
      lastName: 'Ramirez',
      departmentId: 2,
      title: 'Ing.',
      roleCodes: ['solicitante', 'lider_actividad'],
      activityCodes: ['C1A1', 'C1A4'],
    });

    await logic.send(invitation);

    expect(findActivitiesByCodesMock).toHaveBeenCalledWith(['C1A1', 'C1A4']);
    expect(sendClerkInvitationMock).toHaveBeenCalledWith(invitation);
  });

  it('rechaza si se envían actividades sin incluir el rol lider_actividad', async () => {
    const invitation = new Invitation({
      email: 'solicitante@itsoeh.edu.mx',
      firstName: 'Juan',
      lastName: 'Perez',
      departmentId: 1,
      title: 'Lic.',
      roleCodes: ['solicitante'],
      activityCodes: ['C1A1'],
    });

    await expect(logic.send(invitation)).rejects.toThrow(
      InvalidInvitationActivitiesRoleError,
    );
    expect(sendClerkInvitationMock).not.toHaveBeenCalled();
  });

  it('rechaza si incluye el rol lider_actividad pero no se selecciona ninguna actividad', async () => {
    const invitation = new Invitation({
      email: 'lider@itsoeh.edu.mx',
      firstName: 'Juan',
      lastName: 'Perez',
      departmentId: 1,
      title: 'Lic.',
      roleCodes: ['lider_actividad'],
      activityCodes: [],
    });

    await expect(logic.send(invitation)).rejects.toThrow(
      LeaderInvitationRequiresActivitiesError,
    );
    expect(sendClerkInvitationMock).not.toHaveBeenCalled();
  });

  it('rechaza si alguno de los roles no existe en MariaDB', async () => {
    findRolesByCodesMock.mockResolvedValue([{ id: 1, code: 'solicitante' }]);

    const invitation = new Invitation({
      email: 'usuario@itsoeh.edu.mx',
      firstName: 'Juan',
      lastName: 'Perez',
      departmentId: 1,
      title: 'Lic.',
      roleCodes: ['solicitante', 'rol_inexistente'],
      activityCodes: [],
    });

    await expect(logic.send(invitation)).rejects.toThrow(
      InvitationRolesNotFoundError,
    );
    expect(sendClerkInvitationMock).not.toHaveBeenCalled();
  });

  it('rechaza si alguna actividad no existe en MariaDB', async () => {
    findActivitiesByCodesMock.mockResolvedValue([
      { id: 10, code: 'C1A1', leaderId: null, leaderEmail: null },
    ]);

    const invitation = new Invitation({
      email: 'lider@itsoeh.edu.mx',
      firstName: 'Juan',
      lastName: 'Perez',
      departmentId: 1,
      title: 'Lic.',
      roleCodes: ['lider_actividad'],
      activityCodes: ['C1A1', 'C9A9'],
    });

    await expect(logic.send(invitation)).rejects.toThrow(
      InvitationActivitiesNotFoundError,
    );
    expect(sendClerkInvitationMock).not.toHaveBeenCalled();
  });

  it('rechaza con conflicto si una actividad seleccionada ya tiene otro líder asignado', async () => {
    findActivitiesByCodesMock.mockResolvedValue([
      {
        id: 10,
        code: 'C1A1',
        leaderId: 'user-existing-id',
        leaderEmail: 'crojo@placeholder.edu.mx',
      },
    ]);

    const invitation = new Invitation({
      email: 'nuevo.lider@itsoeh.edu.mx',
      firstName: 'Juan',
      lastName: 'Perez',
      departmentId: 1,
      title: 'Ing.',
      roleCodes: ['lider_actividad'],
      activityCodes: ['C1A1'],
    });

    await expect(logic.send(invitation)).rejects.toThrow(
      InvitationActivityAlreadyHasLeaderError,
    );
    expect(sendClerkInvitationMock).not.toHaveBeenCalled();
  });

  it('rechaza si el departamento no existe o no está activo', async () => {
    existsActiveDepartmentMock.mockResolvedValue(false);

    const invitation = new Invitation({
      email: 'usuario@itsoeh.edu.mx',
      firstName: 'Juan',
      lastName: 'Perez',
      departmentId: 999,
      title: 'Lic.',
      roleCodes: ['solicitante'],
      activityCodes: [],
    });

    await expect(logic.send(invitation)).rejects.toThrow(
      InvitationDepartmentNotFoundError,
    );
    expect(sendClerkInvitationMock).not.toHaveBeenCalled();
  });

  it('rechaza si el correo ya pertenece a un usuario registrado', async () => {
    existsUserByEmailMock.mockResolvedValue(true);

    const invitation = new Invitation({
      email: 'duplicado@itsoeh.edu.mx',
      firstName: 'Juan',
      lastName: 'Perez',
      departmentId: 1,
      title: 'Lic.',
      roleCodes: ['solicitante'],
      activityCodes: [],
    });

    await expect(logic.send(invitation)).rejects.toThrow(
      InvitationUserAlreadyExistsError,
    );
    expect(sendClerkInvitationMock).not.toHaveBeenCalled();
  });

  it('rechaza roles o actividades duplicadas', async () => {
    const invitationWithDupRoles = new Invitation({
      email: 'usuario@itsoeh.edu.mx',
      firstName: 'Juan',
      lastName: 'Perez',
      departmentId: 1,
      title: 'Lic.',
      roleCodes: ['solicitante', 'solicitante'],
      activityCodes: [],
    });

    await expect(logic.send(invitationWithDupRoles)).rejects.toThrow(
      InvalidInvitationError,
    );
  });

  it('permite enviar invitación con activityIds y valida existencia y conflictos por ID', async () => {
    findActivitiesByIdsMock.mockResolvedValue([
      { id: 10, code: 'C1A1', leaderId: null, leaderEmail: null },
    ]);

    const invitation = new Invitation({
      email: 'lider@itsoeh.edu.mx',
      firstName: 'Juan',
      lastName: 'Perez',
      departmentId: 1,
      title: 'Lic.',
      roleIds: [2],
      activityIds: [10],
    });

    await logic.send(invitation);

    expect(findActivitiesByIdsMock).toHaveBeenCalledWith([10]);
    expect(sendClerkInvitationMock).toHaveBeenCalledWith(invitation);
    expect(invitation.activityIds).toEqual([10]);
  });

  it('rechaza si activityIds contiene IDs duplicados', async () => {
    const invitation = new Invitation({
      email: 'lider@itsoeh.edu.mx',
      firstName: 'Juan',
      lastName: 'Perez',
      departmentId: 1,
      title: 'Lic.',
      roleIds: [2],
      activityIds: [10, 10],
    });

    await expect(logic.send(invitation)).rejects.toThrow(
      InvalidInvitationError,
    );
    expect(sendClerkInvitationMock).not.toHaveBeenCalled();
  });

  it('rechaza con conflicto si una actividad por ID ya tiene líder', async () => {
    findActivitiesByIdsMock.mockResolvedValue([
      {
        id: 10,
        code: 'C1A1',
        leaderId: 'uuid-otro',
        leaderEmail: 'otro@itsoeh.edu.mx',
      },
    ]);

    const invitation = new Invitation({
      email: 'lider@itsoeh.edu.mx',
      firstName: 'Juan',
      lastName: 'Perez',
      departmentId: 1,
      title: 'Lic.',
      roleIds: [2],
      activityIds: [10],
    });

    await expect(logic.send(invitation)).rejects.toThrow(
      InvitationActivityAlreadyHasLeaderError,
    );
    expect(sendClerkInvitationMock).not.toHaveBeenCalled();
  });
});
