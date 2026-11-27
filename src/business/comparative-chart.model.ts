import type { PurchaseType } from './purchase-request.model';
import { ComparativeChartValidationError } from './comparative-chart.errors';

export const EVALUATION_CRITERIA = [
  'PRECIO',
  'TIEMPO_ENTREGA',
  'TIEMPO_RESPUESTA',
  'FINANCIAMIENTO',
  'GARANTIA',
] as const;
export type EvaluationCriterion = (typeof EVALUATION_CRITERIA)[number];

export const COMPARATIVE_CHART_PURCHASE_TYPES: readonly PurchaseType[] = [
  'COMPRA_ADJ_DIRECTA',
  'COMPRA_INVITACION',
  'COMPRA_LICITACION',
];

export interface ChartProductReference {
  id: string;
  quantity: number;
}

export interface ChartItemInput {
  productItemId: string;
  unitCost: number | null;
}

export interface ChartEvaluationInput {
  criterion: EvaluationCriterion;
  score: number;
  observation: string;
}

export interface ChartColumnInput {
  providerId: number;
  iva: number;
  retentionIva?: number;
  retentionIsr?: number;
  items: ChartItemInput[];
  evaluations: ChartEvaluationInput[];
}

export interface ComputedChartItem {
  productItemId: string;
  unitCost: number | null;
  totalCost: number | null;
}

export interface ComputedChartColumn {
  position: 1 | 2 | 3;
  providerId: number;
  subtotal: number;
  iva: number;
  retentionIva: number;
  retentionIsr: number;
  total: number;
  totalScore: number;
  items: ComputedChartItem[];
  evaluations: ChartEvaluationInput[];
}

export interface ComputedComparativeChart {
  columns: ComputedChartColumn[];
  awardedProviderId: number;
  highestScore: number;
}

const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export function validateAndComputeComparativeChart(
  columnsInput: ChartColumnInput[],
  productItems: ChartProductReference[],
): ComputedComparativeChart {
  if (!Array.isArray(columnsInput) || columnsInput.length !== 3) {
    throw new ComparativeChartValidationError(
      'Debes capturar exactamente 3 proveedores distintos.',
    );
  }

  if (productItems.length === 0) {
    throw new ComparativeChartValidationError(
      'La solicitud no tiene artículos para comparar.',
    );
  }

  const providerIds = columnsInput.map((c) => Number(c.providerId));
  if (
    providerIds.some((id) => !Number.isInteger(id) || id <= 0) ||
    new Set(providerIds).size !== 3
  ) {
    throw new ComparativeChartValidationError(
      'Debes seleccionar exactamente 3 proveedores distintos.',
    );
  }

  const productMap = new Map(productItems.map((p) => [p.id, p]));
  const computedColumns: ComputedChartColumn[] = [];

  for (const [idx, col] of columnsInput.entries()) {
    const position = (idx + 1) as 1 | 2 | 3;
    const itemInputMap = new Map<string, ChartItemInput>();
    for (const item of col.items ?? []) {
      if (!productMap.has(item.productItemId)) {
        throw new ComparativeChartValidationError(
          `El artículo '${item.productItemId}' no pertenece a esta solicitud.`,
        );
      }
      if (itemInputMap.has(item.productItemId)) {
        throw new ComparativeChartValidationError(
          `El proveedor ${position} tiene artículos repetidos.`,
        );
      }
      itemInputMap.set(item.productItemId, item);
    }

    if (itemInputMap.size !== productItems.length) {
      throw new ComparativeChartValidationError(
        `El proveedor ${position} debe incluir todos los artículos de la solicitud.`,
      );
    }

    let quotedCount = 0;
    let subtotal = 0;
    const computedItems: ComputedChartItem[] = [];

    for (const prod of productItems) {
      const entry = itemInputMap.get(prod.id)!;
      if (entry.unitCost === null || entry.unitCost === undefined) {
        computedItems.push({
          productItemId: prod.id,
          unitCost: null,
          totalCost: null,
        });
        continue;
      }

      const unitCost = Number(entry.unitCost);
      if (!Number.isFinite(unitCost) || unitCost < 0) {
        throw new ComparativeChartValidationError(
          `El proveedor ${position} tiene costos unitarios inválidos.`,
        );
      }
      const roundedUnit = roundMoney(unitCost);
      const totalCost = roundMoney(prod.quantity * roundedUnit);
      subtotal = roundMoney(subtotal + totalCost);
      quotedCount += 1;
      computedItems.push({
        productItemId: prod.id,
        unitCost: roundedUnit,
        totalCost,
      });
    }

    if (quotedCount === 0) {
      throw new ComparativeChartValidationError(
        `El proveedor ${position} debe cotizar al menos 1 artículo.`,
      );
    }

    const iva = Number(col.iva);
    const retentionIva = Number(col.retentionIva ?? 0);
    const retentionIsr = Number(col.retentionIsr ?? 0);
    if (
      !Number.isFinite(iva) ||
      iva < 0 ||
      !Number.isFinite(retentionIva) ||
      retentionIva < 0 ||
      !Number.isFinite(retentionIsr) ||
      retentionIsr < 0
    ) {
      throw new ComparativeChartValidationError(
        `El proveedor ${position} tiene impuestos o retenciones inválidas.`,
      );
    }

    const rIva = roundMoney(iva);
    const rRetIva = roundMoney(retentionIva);
    const rRetIsr = roundMoney(retentionIsr);
    const total = roundMoney(subtotal + rIva - rRetIva - rRetIsr);
    if (total < 0) {
      throw new ComparativeChartValidationError(
        `El proveedor ${position} tiene un total final menor a $0.00.`,
      );
    }

    const evalMap = new Map<EvaluationCriterion, ChartEvaluationInput>();
    for (const ev of col.evaluations ?? []) {
      if (!EVALUATION_CRITERIA.includes(ev.criterion)) {
        throw new ComparativeChartValidationError(
          `Criterio de evaluación inválido: '${String(ev.criterion)}'.`,
        );
      }
      if (evalMap.has(ev.criterion)) {
        throw new ComparativeChartValidationError(
          `El proveedor ${position} repite el criterio '${ev.criterion}'.`,
        );
      }
      evalMap.set(ev.criterion, ev);
    }

    if (evalMap.size !== EVALUATION_CRITERIA.length) {
      throw new ComparativeChartValidationError(
        `El proveedor ${position} debe evaluar los 5 criterios obligatorios.`,
      );
    }

    let totalScore = 0;
    const normalizedEvals: ChartEvaluationInput[] = [];
    for (const criterion of EVALUATION_CRITERIA) {
      const ev = evalMap.get(criterion)!;
      const score = Number(ev.score);
      if (!Number.isInteger(score) || score < 0 || score > 9) {
        throw new ComparativeChartValidationError(
          `La calificación de '${criterion}' para el proveedor ${position} debe ser un entero entre 0 y 9.`,
        );
      }
      const observation = String(ev.observation ?? '').trim();
      if (!observation) {
        throw new ComparativeChartValidationError(
          `La observación de '${criterion}' para el proveedor ${position} es obligatoria.`,
        );
      }
      if (observation.length > 500) {
        throw new ComparativeChartValidationError(
          `La observación de '${criterion}' para el proveedor ${position} no puede exceder 500 caracteres.`,
        );
      }
      totalScore += score;
      normalizedEvals.push({ criterion, score, observation });
    }

    computedColumns.push({
      position,
      providerId: Number(col.providerId),
      subtotal,
      iva: rIva,
      retentionIva: rRetIva,
      retentionIsr: rRetIsr,
      total,
      totalScore,
      items: computedItems,
      evaluations: normalizedEvals,
    });
  }

  let winner = computedColumns[0];
  for (const col of computedColumns) {
    if (col.totalScore > winner.totalScore) {
      winner = col;
    }
  }

  return {
    columns: computedColumns,
    awardedProviderId: winner.providerId,
    highestScore: winner.totalScore,
  };
}
