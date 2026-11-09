import { DepartmentController } from './department.controller';
import { UserAssignmentLogicI } from '../../business/user-assignment.ports';
import { DepartmentOption } from '../../business/user-assignment.model';

describe('DepartmentController', () => {
  it('retorna la lista de departamentos llamando a userAssignmentLogic.getDepartments()', async () => {
    const mockDepartments: DepartmentOption[] = [
      { id: 1, name: 'DIRECCIÓN GENERAL' },
      { id: 2, name: 'PLANEACIÓN' },
    ];

    const getDepartmentsMock = jest.fn().mockResolvedValue(mockDepartments);
    const logic: UserAssignmentLogicI = {
      getOptions: jest.fn(),
      getRoles: jest.fn(),
      getDepartments: getDepartmentsMock,
    };

    const controller = new DepartmentController(logic);
    const result = await controller.getDepartments();

    expect(result).toEqual(mockDepartments);
    expect(getDepartmentsMock).toHaveBeenCalledTimes(1);
  });
});

