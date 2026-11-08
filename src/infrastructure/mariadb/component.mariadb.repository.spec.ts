import type { Pool } from 'mariadb';
import { ComponentMariaDBRepository } from './component.mariadb.repository';

describe('ComponentMariaDBRepository', () => {
  it('consulta componentes con INNER JOIN a administrative_units y mapea la estructura correctamente', async () => {
    const execute = jest.fn().mockResolvedValueOnce([
      {
        id: 1,
        code: 'C1',
        name: 'COMPONENTE 1',
        au_id: 1,
        au_code: '1000',
        au_name: 'Dirección Académica',
      },
      {
        id: 2,
        code: 'C2',
        name: 'COMPONENTE 2',
        au_id: 2,
        au_code: '2000',
        au_name: 'Dirección de Planeación y Vinculación',
      },
    ]);

    const repo = new ComponentMariaDBRepository({
      execute,
    } as unknown as Pool);

    const components = await repo.findAllWithAdministrativeUnit();

    expect(execute).toHaveBeenCalledTimes(1);
    expect(components).toEqual([
      {
        id: 1,
        code: 'C1',
        name: 'COMPONENTE 1',
        unit_administrative: {
          id: 1,
          code: '1000',
          name: 'Dirección Académica',
        },
      },
      {
        id: 2,
        code: 'C2',
        name: 'COMPONENTE 2',
        unit_administrative: {
          id: 2,
          code: '2000',
          name: 'Dirección de Planeación y Vinculación',
        },
      },
    ]);
  });
});

