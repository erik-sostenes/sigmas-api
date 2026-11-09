import type { Pool } from 'mariadb';
import { FundingSourceMariaDBRepository } from './funding-source.mariadb.repository';

describe('FundingSourceMariaDBRepository', () => {
  it('consulta fuentes de financiamiento y mapea la estructura correctamente', async () => {
    const execute = jest.fn().mockResolvedValueOnce([
      { id: 1, code: '11', name: 'Recurso Fiscal' },
      { id: 2, code: '14', name: 'Ingresos propios' },
    ]);

    const repo = new FundingSourceMariaDBRepository({
      execute,
    } as unknown as Pool);

    const sources = await repo.findAll();

    expect(execute).toHaveBeenCalledTimes(1);
    expect(sources).toEqual([
      { id: 1, code: '11', name: 'Recurso Fiscal' },
      { id: 2, code: '14', name: 'Ingresos propios' },
    ]);
  });
});

