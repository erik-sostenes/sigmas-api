import { ActivityLogic } from './activity.logic';
import { ActivityRepositoryI } from './activity.ports';
import { ActivityItem } from './activity.model';

describe('ActivityLogic', () => {
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

  it('obtiene todas las actividades delegando al repositorio', async () => {
    const findAll = jest.fn().mockResolvedValue(mockActivities);
    const repo: ActivityRepositoryI = {
      findAll,
      findByComponentId: jest.fn(),
    };

    const logic = new ActivityLogic(repo);
    const result = await logic.getActivities();

    expect(result).toEqual(mockActivities);
    expect(findAll).toHaveBeenCalledWith(undefined);
  });

  it('obtiene actividades filtradas por componentId', async () => {
    const findAll = jest.fn().mockResolvedValue([mockActivities[0]]);
    const repo: ActivityRepositoryI = {
      findAll,
      findByComponentId: jest.fn(),
    };

    const logic = new ActivityLogic(repo);
    const result = await logic.getActivities(1);

    expect(result).toEqual([mockActivities[0]]);
    expect(findAll).toHaveBeenCalledWith(1);
  });

  it('obtiene actividades por componente delegando a findByComponentId', async () => {
    const findByComponentId = jest.fn().mockResolvedValue([mockActivities[1]]);
    const repo: ActivityRepositoryI = {
      findAll: jest.fn(),
      findByComponentId,
    };

    const logic = new ActivityLogic(repo);
    const result = await logic.getActivitiesByComponent(2);

    expect(result).toEqual([mockActivities[1]]);
    expect(findByComponentId).toHaveBeenCalledWith(2);
  });
});

