// Códigos de la tabla roles. Son identificadores fijos: nunca se cambian en la BD.
// Reglas de cada rol: docs/BUSINESS_RULES.md (sección 1).
export const ROLE = {
  SOLICITANTE: 'solicitante',
  LIDER_ACTIVIDAD: 'lider_actividad',
  LIDER_COMPONENTE: 'lider_componente',
  SUFICIENCIA_PRESUPUESTAL: 'suficiencia_presupuestal',
  RECURSOS_MATERIALES: 'recursos_materiales',
  SERVICIOS_ADMINISTRATIVOS: 'servicios_administrativos',
  SUPER_ADMIN: 'super_admin',
} as const;

export type RoleCode = (typeof ROLE)[keyof typeof ROLE];
