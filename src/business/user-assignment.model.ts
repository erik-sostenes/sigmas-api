export const ROLE_CODES = {
  SOLICITANTE: 'solicitante',
  LIDER_ACTIVIDAD: 'lider_actividad',
  SUFICIENCIA_PRESUPUESTAL: 'suficiencia_presupuestal',
  RECURSOS_MATERIALES: 'recursos_materiales',
  SERVICIOS_ADMINISTRATIVOS: 'servicios_administrativos',
  ADMIN: 'admin',
} as const;

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES];

export const LIDER_ACTIVIDAD_ROLE_CODE = ROLE_CODES.LIDER_ACTIVIDAD;
export const ADMIN_ROLE_CODE = ROLE_CODES.ADMIN;

export interface DepartmentOption {
  id: number;
  name: string;
}

export interface RoleOption {
  id: number;
  code: string;
  name: string;
  requiresActivities: boolean;
}

export interface ActivityLeaderSummary {
  id: string;
  title: string | null;
  email: string;
}

export interface ActivityOption {
  id: number;
  code: string;
  name: string;
  currentLeader: ActivityLeaderSummary | null;
}

export interface ComponentWithActivitiesOption {
  id: number;
  code: string;
  name: string;
  activities: ActivityOption[];
}

export interface UserAssignmentOptions {
  departments: DepartmentOption[];
  roles: RoleOption[];
  components: ComponentWithActivitiesOption[];
}

