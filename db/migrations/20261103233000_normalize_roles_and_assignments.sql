-- migrate:up
ALTER TABLE departments
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE departments
SET name = 'SOPORTE TÉCNICO', is_active = TRUE
WHERE name = 'Soporte Técnico';

UPDATE departments
SET name = 'PLANEACIÓN', is_active = TRUE
WHERE name = 'Planeación';

ALTER TABLE roles
    ADD COLUMN code VARCHAR(50) NULL AFTER id,
    MODIFY COLUMN name VARCHAR(100) NOT NULL;

UPDATE roles
SET code = CASE LOWER(TRIM(name))
    WHEN 'solicitante' THEN 'solicitante'
    WHEN 'lider' THEN 'lider_actividad'
    WHEN 'líder de actividad' THEN 'lider_actividad'
    WHEN 'lider de actividad' THEN 'lider_actividad'
    WHEN 'lider_actividad' THEN 'lider_actividad'
    WHEN 'suficiencia' THEN 'suficiencia_presupuestal'
    WHEN 'suficiencia presupuestal' THEN 'suficiencia_presupuestal'
    WHEN 'suficiencia_presupuestal' THEN 'suficiencia_presupuestal'
    WHEN 'recursos' THEN 'recursos_materiales'
    WHEN 'recursos materiales y servicios' THEN 'recursos_materiales'
    WHEN 'recursos_materiales' THEN 'recursos_materiales'
    WHEN 'revisa' THEN 'servicios_administrativos'
    WHEN 'servicios administrativos' THEN 'servicios_administrativos'
    WHEN 'servicios_administrativos' THEN 'servicios_administrativos'
    WHEN 'admin' THEN 'admin'
    WHEN 'administrador' THEN 'admin'
    ELSE LOWER(REPLACE(TRIM(name), ' ', '_'))
END
WHERE code IS NULL;

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT ur.user_id, canonical.keep_id
FROM user_roles ur
INNER JOIN roles r ON r.id = ur.role_id
INNER JOIN (
    SELECT code, MIN(id) AS keep_id
    FROM roles
    GROUP BY code
) canonical ON canonical.code = r.code
WHERE ur.role_id <> canonical.keep_id;

DELETE ur
FROM user_roles ur
INNER JOIN roles r ON r.id = ur.role_id
INNER JOIN (
    SELECT code, MIN(id) AS keep_id
    FROM roles
    GROUP BY code
) canonical ON canonical.code = r.code
WHERE ur.role_id <> canonical.keep_id;

DELETE r
FROM roles r
INNER JOIN (
    SELECT code, MIN(id) AS keep_id
    FROM roles
    GROUP BY code
) canonical ON canonical.code = r.code
WHERE r.id <> canonical.keep_id;

ALTER TABLE roles
    MODIFY COLUMN code VARCHAR(50) NOT NULL,
    ADD CONSTRAINT uq_roles_code UNIQUE (code);

INSERT INTO roles (code, name) VALUES
    ('solicitante', 'Solicitante'),
    ('lider_actividad', 'Líder de actividad'),
    ('suficiencia_presupuestal', 'Suficiencia presupuestal'),
    ('recursos_materiales', 'Recursos materiales y servicios'),
    ('servicios_administrativos', 'Servicios administrativos'),
    ('admin', 'Administrador')
ON DUPLICATE KEY UPDATE
    name = VALUES(name);

ALTER TABLE activities
    MODIFY COLUMN leader_id CHAR(36) NULL;

-- migrate:down
ALTER TABLE activities
    MODIFY COLUMN leader_id CHAR(36) NOT NULL;

UPDATE roles SET name = 'SOLICITANTE' WHERE code = 'solicitante';
UPDATE roles SET name = 'LIDER' WHERE code = 'lider_actividad';
UPDATE roles SET name = 'SUFICIENCIA' WHERE code = 'suficiencia_presupuestal';
UPDATE roles SET name = 'ADMIN' WHERE code = 'admin';
UPDATE roles SET name = 'recursos_materiales' WHERE code = 'recursos_materiales';
UPDATE roles SET name = 'servicios_administrativos' WHERE code = 'servicios_administrativos';

ALTER TABLE roles
    DROP INDEX uq_roles_code,
    DROP COLUMN code,
    MODIFY COLUMN name VARCHAR(50) NOT NULL;

UPDATE departments SET name = 'Soporte Técnico' WHERE name = 'SOPORTE TÉCNICO';
UPDATE departments SET name = 'Planeación' WHERE name = 'PLANEACIÓN';

ALTER TABLE departments
    DROP COLUMN is_active;

