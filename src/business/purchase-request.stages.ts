import type { RequestStatus } from './purchase-request.model';
import type {
  Inbox,
  StatusGroup,
  StatusGroupCondition,
} from './purchase-request.ports';

// Etapas (pestañas) de cada bandeja (docs/BUSINESS_RULES.md, sección 6).
// "por_validar" es lo que le toca a quien consulta: para el solicitante, que nadie la
// haya tocado; para las demás áreas, que esté esperando su decisión.
// Las mismas condiciones sirven para filtrar, contar y calcular statusGroup.
// Al agregar un estado al flujo hay que asignarlo aquí en cada bandeja que lo vea.

const APPROVED: readonly RequestStatus[] = ['APRUEBA_FISCAL'];

const REJECTED: readonly RequestStatus[] = [
  'RECHAZA_LIDER',
  'RECHAZA_SUFICIENCIA',
  'RECHAZA_SUFICIENCIA_FINAL',
  'RECHAZA_REVISION',
  'RECHAZA_DIRECCION',
  'RECHAZA_FISCAL',
];

// No terminales después de que todos los líderes aprobaron.
const AFTER_LEADERS: readonly RequestStatus[] = [
  'APRUEBA_LIDER',
  'AUTORIZA_SUFICIENCIA',
  'EN_REVISION_RECURSOS',
  'PENDIENTE_APROBACION_SUFICIENCIA',
  'APRUEBA_SUFICIENCIA',
  'APRUEBA_REVISION',
  'AUTORIZA_DIRECCION',
];

const terminal = {
  aprobadas: { statuses: APPROVED },
  rechazadas: { statuses: REJECTED },
};

export const INBOX_STAGES: Record<
  Inbox,
  Record<StatusGroup, StatusGroupCondition>
> = {
  // Solicitante: por validar = ningún líder ha decidido.
  mine: {
    por_validar: { statuses: [], solicitado: 'sin_decisiones' },
    en_proceso: { statuses: AFTER_LEADERS, solicitado: 'con_decisiones' },
    ...terminal,
  },
  // Líder: por decidir = le queda una fila suya pendiente.
  leader: {
    por_validar: { statuses: [], solicitado: 'fila_propia_pendiente' },
    en_proceso: {
      statuses: AFTER_LEADERS,
      solicitado: 'sin_fila_propia_pendiente',
    },
    ...terminal,
  },
  // Suficiencia: por decidir = primera o segunda revisión.
  sufficiency: {
    por_validar: {
      statuses: ['APRUEBA_LIDER', 'PENDIENTE_APROBACION_SUFICIENCIA'],
    },
    en_proceso: {
      statuses: [
        'AUTORIZA_SUFICIENCIA',
        'EN_REVISION_RECURSOS',
        'APRUEBA_SUFICIENCIA',
        'APRUEBA_REVISION',
        'AUTORIZA_DIRECCION',
      ],
    },
    ...terminal,
  },
  // Recursos materiales: por decidir = le llegó o está haciendo el estudio de mercado.
  resources: {
    por_validar: { statuses: ['AUTORIZA_SUFICIENCIA', 'EN_REVISION_RECURSOS'] },
    en_proceso: {
      statuses: [
        'PENDIENTE_APROBACION_SUFICIENCIA',
        'APRUEBA_SUFICIENCIA',
        'APRUEBA_REVISION',
        'AUTORIZA_DIRECCION',
      ],
    },
    ...terminal,
  },
};
