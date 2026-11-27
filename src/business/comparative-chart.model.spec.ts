import {
  EVALUATION_CRITERIA,
  validateAndComputeComparativeChart,
  type ChartColumnInput,
} from './comparative-chart.model';
import { ComparativeChartValidationError } from './comparative-chart.errors';

const products = [
  { id: 'p1', quantity: 5 },
  { id: 'p2', quantity: 2 },
];

function makeEvaluations(score: number) {
  return EVALUATION_CRITERIA.map((criterion) => ({
    criterion,
    score,
    observation: `Observación para ${criterion}`,
  }));
}

function makeColumn(
  providerId: number,
  unitCosts: [number | null, number | null],
  score: number,
  overrides: Partial<ChartColumnInput> = {},
): ChartColumnInput {
  return {
    providerId,
    iva: 100,
    retentionIva: 0,
    retentionIsr: 0,
    items: [
      { productItemId: 'p1', unitCost: unitCosts[0] },
      { productItemId: 'p2', unitCost: unitCosts[1] },
    ],
    evaluations: makeEvaluations(score),
    ...overrides,
  };
}

describe('validateAndComputeComparativeChart', () => {
  it('calcula importes, puntajes y ganador correctamente (CC-13 a CC-23)', () => {
    const result = validateAndComputeComparativeChart(
      [
        makeColumn(1, [100, 50], 8, { iva: 96, retentionIva: 10, retentionIsr: 5 }),
        makeColumn(2, [90, null], 6, { iva: 72 }),
        makeColumn(3, [120, 60], 7, { iva: 115.2 }),
      ],
      products,
    );

    expect(result.awardedProviderId).toBe(1);
    expect(result.highestScore).toBe(40);
    expect(result.columns[0].subtotal).toBe(600);
    expect(result.columns[0].total).toBe(681);
    expect(result.columns[1].items[1].totalCost).toBeNull();
    expect(result.columns[1].subtotal).toBe(450);
  });

  it('rechaza proveedores repetidos o distintos de 3 (CC-11, CC-12)', () => {
    expect(() =>
      validateAndComputeComparativeChart(
        [
          makeColumn(1, [100, 50], 7),
          makeColumn(1, [90, 40], 6),
          makeColumn(3, [110, 55], 5),
        ],
        products,
      ),
    ).toThrow(ComparativeChartValidationError);
  });

  it('rechaza un proveedor con todos los artículos sin cotizar (CC-15)', () => {
    expect(() =>
      validateAndComputeComparativeChart(
        [
          makeColumn(1, [100, 50], 7),
          makeColumn(2, [null, null], 6),
          makeColumn(3, [110, 55], 5),
        ],
        products,
      ),
    ).toThrow(ComparativeChartValidationError);
  });

  it('rechaza total final negativo (CC-18)', () => {
    expect(() =>
      validateAndComputeComparativeChart(
        [
          makeColumn(1, [10, 10], 7, { iva: 0, retentionIva: 100 }),
          makeColumn(2, [90, 40], 6),
          makeColumn(3, [110, 55], 5),
        ],
        products,
      ),
    ).toThrow(ComparativeChartValidationError);
  });

  it('rechaza calificaciones fuera de 0-9 u observaciones vacías (CC-20, CC-21)', () => {
    expect(() =>
      validateAndComputeComparativeChart(
        [
          makeColumn(1, [100, 50], 10),
          makeColumn(2, [90, 40], 6),
          makeColumn(3, [110, 55], 5),
        ],
        products,
      ),
    ).toThrow(ComparativeChartValidationError);

    const emptyObsEvals = makeEvaluations(6);
    emptyObsEvals[0].observation = '   ';
    expect(() =>
      validateAndComputeComparativeChart(
        [
          makeColumn(1, [100, 50], 6, { evaluations: emptyObsEvals }),
          makeColumn(2, [90, 40], 6),
          makeColumn(3, [110, 55], 5),
        ],
        products,
      ),
    ).toThrow(ComparativeChartValidationError);
  });
});
