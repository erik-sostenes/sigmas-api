import { ActivityController } from './activity.controller';
import { ActivityLogicI } from '../../business/activity.ports';
import { ActivityItem } from '../../business/activity.model';

describe('ActivityController', () => {
  const mockActivities: ActivityItem[] = [
    {
      id: 1,
      code: '01',
      name: 'Actividad 1',
      component: { id: 1, code: '01', name: 'Componente 1' },
    },
    {
      id: 2,
      code: '01',
      name: 'Actividad 1 de comp 2',
      component: { id: 2, code: '02', name: 'Componente 2' },
    },
  ];

  it('retorna la lista de todas las actividades cuando no se envía filtro', async () => {
    const getActivitiesMock = jest.fn().mockResolvedValue(mockActivities);
    const logic: ActivityLogicI = {
      getActivities: getActivitiesMock,
      getActivitiesByComponent: jest.fn(),
    };

    const controller = new ActivityController(logic);
    const result = await controller.getActivities();

    expect(result).toEqual(mockActivities);
    expect(getActivitiesMock).toHaveBeenCalledWith(undefined);
  });

  it('retorna actividades filtradas por componentId cuando se envía por query', async () => {
    const getActivitiesMock = jest.fn().mockResolvedValue([mockActivities[0]]);
    const logic: ActivityLogicI = {
      getActivities: getActivitiesMock,
      getActivitiesByComponent: jest.fn(),
    };

    const controller = new ActivityController(logic);
    const result = await controller.getActivities('1');

    expect(result).toEqual([mockActivities[0]]);
    expect(getActivitiesMock).toHaveBeenCalledWith(1);
  });

  it('retorna actividades por componente llamando a getActivitiesByComponent', async () => {
    const getByCompMock = jest.fn().mockResolvedValue([mockActivities[1]]);
    const logic: ActivityLogicI = {
      getActivities: jest.fn(),
      getActivitiesByComponent: getByCompMock,
    };

    const controller = new ActivityController(logic);
    const result = await controller.getActivitiesByComponent(2);

    expect(result).toEqual([mockActivities[1]]);
    expect(getByCompMock).toHaveBeenCalledWith(2);
  });
});

