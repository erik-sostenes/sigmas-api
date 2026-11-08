import { RoleController } from './role.controller';
import { UserAssignmentLogicI } from '../../business/user-assignment.ports';
import { RoleOption } from '../../business/user-assignment.model';

describe('RoleController', () => {
  it('retorna la lista de roles del catálogo llamando a userAssignmentLogic.getRoles()', async () => {
    const mockRoles: RoleOption[] = [
      { id: 1, code: 'solicitante', name: 'Solicitante', requiresActivities: false },
      { id: 2, code: 'lider_actividad', name: 'Líder de actividad', requiresActivities: true },
    ];

    const getRolesMock = jest.fn().mockResolvedValue(mockRoles);
    const logic: UserAssignmentLogicI = {
      getOptions: jest.fn(),
      getRoles: getRolesMock,
    };

    const controller = new RoleController(logic);
    const result = await controller.getRoles();

    expect(result).toEqual(mockRoles);
    expect(getRolesMock).toHaveBeenCalledTimes(1);
  });
});
