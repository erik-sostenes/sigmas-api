import type { RequestStatus } from './purchase-request.model';
import type {
  StatusGroup,
  StatusGroupCondition,
} from './purchase-request.ports';

// Etapas de las pestañas (docs/BUSINESS_RULES.md, sección 6).
// - por_validar: ningún líder ha decidido todavía.
// - en_proceso: ya empezó y no ha terminado; incluye SOLICITADO con alguna fila aprobada.
// - aprobadas / rechazadas: terminales.
// Al agregar un estado al flujo hay que asignarlo aquí a una etapa.
export const STATUS_GROUP_CONDITIONS: Record<
  StatusGroup,
  StatusGroupCondition
> = {
  por_validar: { statuses: [], solicitado: 'sin_decisiones' },
  en_proceso: {
    statuses: [
      'APRUEBA_LIDER',
      'AUTORIZA_SUFICIENCIA',
      'EN_REVISION_RECURSOS',
      'PENDIENTE_APROBACION_SUFICIENCIA',
      'APRUEBA_SUFICIENCIA',
      'APRUEBA_REVISION',
      'AUTORIZA_DIRECCION',
    ],
    solicitado: 'con_decisiones',
  },
  aprobadas: { statuses: ['APRUEBA_FISCAL'] },
  rechazadas: {
    statuses: [
      'RECHAZA_LIDER',
      'RECHAZA_SUFICIENCIA',
      'RECHAZA_SUFICIENCIA_FINAL',
      'RECHAZA_REVISION',
      'RECHAZA_DIRECCION',
      'RECHAZA_FISCAL',
    ],
  },
};

// Etapa de una solicitud. `hasLeaderDecisions`: algún líder ya decidió alguna fila
// (de cualquier líder, no solo las que ve quien consulta).
export function statusGroupOf(
  status: RequestStatus,
  hasLeaderDecisions: boolean,
): StatusGroup {
  if (status === 'SOLICITADO') {
    return hasLeaderDecisions ? 'en_proceso' : 'por_validar';
  }
  const entry = (
    Object.entries(STATUS_GROUP_CONDITIONS) as [
      StatusGroup,
      StatusGroupCondition,
    ][]
  ).find(([, condition]) => condition.statuses.includes(status));
  // Todos los estados están asignados; si falta uno nuevo, cae en en_proceso.
  return entry ? entry[0] : 'en_proceso';
}
