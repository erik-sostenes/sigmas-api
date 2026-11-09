import { FundingSourceController } from './funding-source.controller';
import { FundingSourceLogicI } from '../../business/funding-source.ports';
import { FundingSource } from '../../business/funding-source.model';

describe('FundingSourceController', () => {
  it('retorna la lista de fuentes de financiamiento', async () => {
    const mockSources: FundingSource[] = [
      { id: 1, code: '11', name: 'Recurso Fiscal' },
      { id: 2, code: '14', name: 'Ingresos propios' },
    ];

    const getFundingSourcesMock = jest.fn().mockResolvedValue(mockSources);
    const logic: FundingSourceLogicI = {
      getFundingSources: getFundingSourcesMock,
    };

    const controller = new FundingSourceController(logic);
    const result = await controller.getFundingSources();

    expect(result).toEqual(mockSources);
    expect(getFundingSourcesMock).toHaveBeenCalledTimes(1);
  });
});

