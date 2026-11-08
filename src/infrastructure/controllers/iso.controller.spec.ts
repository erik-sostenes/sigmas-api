import { IsoController } from './iso.controller';
import { IsoLogicI } from '../../business/iso.ports';
import { IsoStandard } from '../../business/iso.model';

describe('IsoController', () => {
  it('retorna la lista de normas ISO llamando a isoLogic.getIsos()', async () => {
    const mockIsos: IsoStandard[] = [
      { id: 1, code: 'ISO 9001:2015', name: 'Gestión de la Calidad' },
      { id: 2, code: 'ISO 14001:2015', name: 'Gestión Ambiental' },
    ];

    const getIsosMock = jest.fn().mockResolvedValue(mockIsos);
    const logic: IsoLogicI = {
      getIsos: getIsosMock,
    };

    const controller = new IsoController(logic);
    const result = await controller.getIsos();

    expect(result).toEqual(mockIsos);
    expect(getIsosMock).toHaveBeenCalledTimes(1);
  });
});

