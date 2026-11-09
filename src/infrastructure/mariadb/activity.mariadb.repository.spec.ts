import type { Pool } from 'mariadb';
import { ActivityMariaDBRepository } from './activity.mariadb.repository';

describe('ActivityMariaDBRepository', () => {
  const rawRows = [
    {
      id: 1,
      code: '01',
      name: 'Actividad 1',
      component_id: 1,
      comp_code: '01',
      comp_name: 'Componente 1',
    },
    {
      id: 9,
      code: '01',
      name: 'Actividad 1 de Comp 2',
      component_id: 2,
      comp_code: '02',
      comp_name: 'Componente 2',
    },
  ];

  it('consulta todas las actividades con JOIN a components cuando no hay filtro', async () => {
    const execute = jest.fn().mockResolvedValueOnce(rawRows);
    const repo = new ActivityMariaDBRepository({
      execute,
    } as unknown as Pool);

    const activities = await repo.findAll();

    expect(execute).toHaveBeenCalledTimes(1);
    expect(activities).toEqual([
      {
        id: 1,
        code: '01',
        name: 'Actividad 1',
        component: {
          id: 1,
          code: '01',
          name: 'Componente 1',
        },
      },
      {
        id: 9,
        code: '01',
        name: 'Actividad 1 de Comp 2',
        component: {
          id: 2,
          code: '02',
          name: 'Componente 2',
        },
      },
    ]);
  });

  it('consulta actividades filtrando por componentId', async () => {
    const execute = jest.fn().mockResolvedValueOnce([rawRows[0]]);
    const repo = new ActivityMariaDBRepository({
      execute,
    } as unknown as Pool);

    const activities = await repo.findAll(1);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('WHERE a.component_id = ?'),
      [1],
    );
    expect(activities).toHaveLength(1);
    expect(activities[0].id).toBe(1);
  });

  it('consulta actividades por findByComponentId delegando a findAll con componentId', async () => {
    const execute = jest.fn().mockResolvedValueOnce([rawRows[1]]);
    const repo = new ActivityMariaDBRepository({
      execute,
    } as unknown as Pool);

    const activities = await repo.findByComponentId(2);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(activities[0].component.id).toBe(2);
  });
});

