import type { RoleCode } from './role-codes';

// Usuario autenticado que hace la petición, resuelto desde la BD (fuente de verdad de los roles).
export interface Viewer {
  userId: string;
  roleCodes: RoleCode[];
}
