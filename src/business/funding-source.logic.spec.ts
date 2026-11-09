import { FundingSourceLogic } from './funding-source.logic';
import { FundingSourceRepositoryI } from './funding-source.ports';
import { FundingSource } from './funding-source.model';

describe('FundingSourceLogic', () => {
  const mockSources: FundingSource[] = [
    { id: 1, code: '11', name: 'Recurso Fiscal' },
    { id: 2, code: '14', name: 'Ingresos propios' },
  ];

  it('obtiene las fuentes de financiamiento delegando al repositorio', async () => {
    const findAll = jest.fn().mockResolvedValue(mockSources);
    const repo: FundingSourceRepositoryI = {
      findAll,
    };

    const logic = new FundingSourceLogic(repo);
    const result = await logic.getFundingSources();

    expect(result).toEqual(mockSources);
    expect(findAll).toHaveBeenCalledTimes(1);
  });
});

