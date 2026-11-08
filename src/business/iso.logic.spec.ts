import { IsoLogic } from './iso.logic';
import { IsoRepositoryI } from './iso.ports';
import { IsoStandard } from './iso.model';

describe('IsoLogic', () => {
  it('retorna las normas ISO desde el repositorio', async () => {
    const mockIsos: IsoStandard[] = [
      { id: 1, code: 'ISO 9001:2015', name: 'Gestión de la Calidad' },
      { id: 2, code: 'ISO 14001:2015', name: 'Gestión Ambiental' },
    ];

    const findAllMock = jest.fn().mockResolvedValue(mockIsos);
    const repository: IsoRepositoryI = {
      findAll: findAllMock,
    };

    const logic = new IsoLogic(repository);
    const result = await logic.getIsos();

    expect(result).toEqual(mockIsos);
    expect(findAllMock).toHaveBeenCalledTimes(1);
  });
});

