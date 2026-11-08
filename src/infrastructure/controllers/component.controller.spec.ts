import { ComponentController } from './component.controller';
import { ComponentLogicI } from '../../business/component.ports';
import { ComponentWithAdministrativeUnit } from '../../business/component.model';

describe('ComponentController', () => {
  it('retorna la lista de componentes con su unidad administrativa sin requerir autorización', async () => {
    const mockComponents: ComponentWithAdministrativeUnit[] = [
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
    ];

    const getComponentsMock = jest.fn().mockResolvedValue(mockComponents);
    const logic: ComponentLogicI = {
      getComponents: getComponentsMock,
    };

    const controller = new ComponentController(logic);
    const result = await controller.getComponents();

    expect(result).toEqual(mockComponents);
    expect(getComponentsMock).toHaveBeenCalledTimes(1);
  });
});

