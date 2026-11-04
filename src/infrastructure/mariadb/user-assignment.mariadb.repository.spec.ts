import type { Pool } from 'mariadb';
import { UserAssignmentMariaDBRepository } from './user-assignment.mariadb.repository';

describe('UserAssignmentMariaDBRepository', () => {
  it('devuelve departamentos activos, roles con requiresActivities y actividades agrupadas por componente con su líder actual', async () => {
    const execute = jest
      .fn()
      // departments
      .mockResolvedValueOnce([
        { id: 1, name: 'DIRECCIÓN GENERAL' },
        { id: 2, name: 'SOPORTE TÉCNICO' },
      ])
      // roles
      .mockResolvedValueOnce([
        { id: 1, code: 'solicitante', name: 'Solicitante' },
        { id: 2, code: 'lider_actividad', name: 'Líder de actividad' },
        { id: 6, code: 'admin', name: 'Administrador' },
      ])
      // components
      .mockResolvedValueOnce([
        { id: 10, code: 'C1', name: 'COMPONENTE 1' },
        { id: 20, code: 'C2', name: 'COMPONENTE 2' },
      ])
      // activities
      .mockResolvedValueOnce([
        {
          id: 100,
          component_id: 10,
          code: 'C1A1',
          name: 'ACTIVIDAD 1.1',
          leader_id: 'uuid-1',
          leader_title: 'C.P.',
          leader_email: 'crojo@placeholder.edu.mx',
        },
        {
          id: 101,
          component_id: 10,
          code: 'C1A2',
          name: 'ACTIVIDAD 1.2',
          leader_id: null,
          leader_title: null,
          leader_email: null,
        },
      ]);

    const repo = new UserAssignmentMariaDBRepository({
      execute,
    } as unknown as Pool);

    const options = await repo.findOptions();

    expect(options.departments).toEqual([
      { id: 1, name: 'DIRECCIÓN GENERAL' },
      { id: 2, name: 'SOPORTE TÉCNICO' },
    ]);
    expect(options.roles).toEqual([
      {
        id: 1,
        code: 'solicitante',
        name: 'Solicitante',
        requiresActivities: false,
      },
      {
        id: 2,
        code: 'lider_actividad',
        name: 'Líder de actividad',
        requiresActivities: true,
      },
      {
        id: 6,
        code: 'admin',
        name: 'Administrador',
        requiresActivities: false,
      },
    ]);
    expect(options.components).toEqual([
      {
        id: 10,
        code: 'C1',
        name: 'COMPONENTE 1',
        activities: [
          {
            id: 100,
            code: 'C1A1',
            name: 'ACTIVIDAD 1.1',
            currentLeader: {
              id: 'uuid-1',
              title: 'C.P.',
              email: 'crojo@placeholder.edu.mx',
            },
          },
          {
            id: 101,
            code: 'C1A2',
            name: 'ACTIVIDAD 1.2',
            currentLeader: null,
          },
        ],
      },
      {
        id: 20,
        code: 'C2',
        name: 'COMPONENTE 2',
        activities: [],
      },
    ]);
  });
});

