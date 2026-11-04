-- Script de apoyo para desarrollo local:
-- Libera las actividades que tienen asignado un líder placeholder de db/inserts.sql
-- para poder probar invitaciones con el rol 'lider_actividad' sin conflicto.
-- NO ejecutar automáticamente en producción.

UPDATE activities a
INNER JOIN users u ON u.id = a.leader_id
SET a.leader_id = NULL
WHERE u.clerk_id LIKE 'placeholder_%';

