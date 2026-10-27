-- migrate:up
CREATE TABLE if not exists departments ( -- falta -> 
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL unique -- 'Soporte Técnico' -> 
);

CREATE TABLE if not exists administrative_units ( -- ya lo tenemos
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL
);
 -- 1000 <-> 'Dirección Académica', 2000 <-> 'Dirección de Planeación y Vinculación', 3000 <->'Subdirección de Posgrado e Investigación',
 -- 'Subdirección de Planeación', 'Subdirección de Servicios Administrativos'

CREATE TABLE if not exists funding_sources (-- Ya lo tenemos...
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL
);
-- ('11', 'Recurso Fiscal'), ('14', 'Ingresos propios'), ('25', 'Recurso Federal')

CREATE TABLE if not exists measurement_units ( -- Ya lo tenemos...
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT null -- BULTO, CAJA, CENTIMETRO, ETC. 
);

CREATE TABLE if not exists budget_items ( -- ya lo tenemos pero definir cuales son realmente las utilies
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, -- partidas presupuestal ......
    code VARCHAR(10) NOT NULL UNIQUE, -- Ej. 247001
    name VARCHAR(255) NOT null -- Artículos metálicos para la construcción 
);

CREATE TABLE if not exists users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()), 
    clerk_id VARCHAR(100) NOT NULL UNIQUE,    
    department_id INT UNSIGNED NOT NULL,
    title VARCHAR(30) NULL,                   -- Ing., Lic., Mtra.
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT
);

CREATE TABLE if not exists roles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE if not exists user_roles (
    user_id CHAR(36) NOT NULL,
    role_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE TABLE if not exists components ( -- ya lo tenemos 
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,         -- Ej. C1, 01
    name VARCHAR(255) NOT NULL, -- ESTUDIANTES DEL NIVEL SUPERIOR DE EDUCACIÓN EN INSTITUCIONES PÚBLICAS FORMADOS
    administrative_unit_id INT UNSIGNED NOT NULL, 
    leader_id CHAR(36) NOT NULL,             
    FOREIGN KEY (administrative_unit_id) REFERENCES administrative_units(id),
    FOREIGN KEY (leader_id) REFERENCES users(id)
);

CREATE TABLE if not exists activities ( -- ya lo tenemos
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    component_id INT UNSIGNED NOT NULL,
    code VARCHAR(10) NOT NULL UNIQUE,       
    name VARCHAR(255) NOT NULL,
    leader_id CHAR(36) NOT NULL,             
    FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE,
    FOREIGN KEY (leader_id) REFERENCES users(id)
);

CREATE TABLE if not exists purchase_requests (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    request_number INT AUTO_INCREMENT UNIQUE, -- folio
    requested_by CHAR(36) NOT NULL,
    status ENUM(
        'SOLICITADO',
        'AUTORIZA_LIDER', 
        'RECHAZA_LIDER',
        'AUTORIZA_SUFICIENCIA',
        'RECHAZA_SUFICIENCIA',
        'APRUEBA_SUFICIENCIA'
    ) NOT NULL DEFAULT 'SOLICITADO',
    purchase_type ENUM('COMPRA_MOSTRADOR', 'COMPRA_ADJ_DIRECTA', 'COMPRA_LICITACION', 'COMPRA_INVITACION') NOT NULL,
    iso VARCHAR(200) NOT NULL DEFAULT 'NOM-012-SCFI-1994 DEL SGC', 
    justification TEXT NOT NULL,
    total_amount_estimated DECIMAL(12,2) NOT NULL DEFAULT 0, 
    total_amount_final DECIMAL(12,2) NOT NULL DEFAULT 0,     
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (requested_by) REFERENCES users(id)
);

CREATE TABLE if not exists request_components (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    purchase_request_id CHAR(36) NOT NULL,
    component_id INT UNSIGNED NOT NULL,
    activity_id INT UNSIGNED NOT NULL,
    funding_source_id INT UNSIGNED NOT NULL,
    estimated_amount DECIMAL(12,2) NOT NULL, -- El monto estimado que el solicitante le asigna a este componente
    final_amount DECIMAL(12,2) NOT NULL DEFAULT 0, -- Lo que queda tras el estudio de mercado
    UNIQUE (purchase_request_id, component_id), -- Evita duplicar el mismo componente en la misma solicitud
    FOREIGN KEY (purchase_request_id) REFERENCES purchase_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (component_id) REFERENCES components(id),
    FOREIGN KEY (activity_id) REFERENCES activities(id),
    FOREIGN KEY (funding_source_id) REFERENCES funding_sources(id)
);


CREATE TABLE if not exists product_items (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    purchase_request_id CHAR(36) NOT NULL,
    budget_item_id INT UNSIGNED NOT NULL, -- La partida (ej. 247001)
    measurement_unit_id INT UNSIGNED NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    description VARCHAR(500) NOT NULL,
    estimated_price DECIMAL(12,2) NOT NULL, 
    final_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    FOREIGN KEY (purchase_request_id) REFERENCES purchase_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (budget_item_id) REFERENCES budget_items(id),
    FOREIGN KEY (measurement_unit_id) REFERENCES measurement_units(id)
);

<<<<<<< HEAD

INSERT IGNORE INTO departments (name) VALUES
  ('Soporte Técnico'),
  ('Planeación');

INSERT IGNORE INTO roles (name) VALUES
  ('SOLICITANTE'),
  ('LIDER'),
  ('SUFICIENCIA'),
  ('ADMIN');

INSERT IGNORE INTO users
  (id, clerk_id, department_id, title, first_name, last_name, email)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'user_fake_juan',
   (SELECT id FROM departments WHERE name = 'Soporte Técnico'),
   'Ing.', 'Juan', 'Pérez', 'juan@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'user_fake_maria',
   (SELECT id FROM departments WHERE name = 'Planeación'),
   'Lic.', 'María', 'López', 'maria@test.com'),
  ('33333333-3333-3333-3333-333333333333', 'user_fake_carlos',
   (SELECT id FROM departments WHERE name = 'Planeación'),
   'Mtro.', 'Carlos', 'Ruiz', 'carlos@test.com');

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT '11111111-1111-1111-1111-111111111111', id FROM roles WHERE name = 'SOLICITANTE';

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT '22222222-2222-2222-2222-222222222222', id FROM roles WHERE name = 'LIDER';

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT '33333333-3333-3333-3333-333333333333', id FROM roles WHERE name = 'SUFICIENCIA';

=======
-- ============================================================
-- SEED DATA
-- ============================================================

-- ------------------------------------------------------------
-- departments
-- (derivados de las áreas únicas de los solicitantes)
-- ------------------------------------------------------------
INSERT INTO departments (name) VALUES
    ('DIRECCIÓN GENERAL'),
    ('RESIDENCIAS PROFESIONALES Y SERVICIO SOCIAL'),
    ('INVESTIGACIÓN Y POSGRADO'),
    ('DIFUSIÓN, CULTURA Y DEPORTE'),
    ('CIENCIAS BÁSICAS'),
    ('DESARROLLO ACADÉMICO'),
    ('CONTROL ESCOLAR'),
    ('INGENIERÍA EN TECNOLOGÍAS DE LA INFORMACIÓN Y COMUNICACIONES'),
    ('PLANEACIÓN Y VINCULACIÓN'),
    ('VINCULACIÓN'),
    ('PLANEACIÓN'),
    ('SERVICIOS ADMINISTRATIVOS'),
    ('DESARROLLO DE PERSONAL'),
    ('RECURSOS MATERIALES Y SERVICIOS'),
    ('INGENIERÍA INDUSTRIAL'),
    ('INGENIERÍA EN INDUSTRIAS ALIMENTARIAS'),
    ('INGENIERÍA ELECTROMECANICA'),
    ('SUBDIRECCIÓN ACADÉMICA'),
    ('INGENIERÍA EN GESTIÓN EMPRESARIAL'),
    ('ARQUITECTURA'),
    ('INGENIERÍA EN LOGISTICA'),
    ('INGENIERÍA EN SISTEMAS COMPUTACIONALES');

-- ------------------------------------------------------------
-- administrative_units
-- ------------------------------------------------------------
INSERT INTO administrative_units (code, name) VALUES
    ('1000', 'Dirección Académica'),
    ('2000', 'Dirección de Planeación y Vinculación'),
    ('3000', 'Subdirección de Posgrado e Investigación'),
    ('4000', 'Subdirección de Planeación'),
    ('5000', 'Subdirección de Servicios Administrativos');

-- ------------------------------------------------------------
-- funding_sources
-- ------------------------------------------------------------
INSERT INTO funding_sources (code, name) VALUES
    ('11', 'Recurso Fiscal'),
    ('14', 'Ingresos propios'),
    ('25', 'Recurso Federal');

-- ------------------------------------------------------------
-- users
-- Orden: primero los líderes de componentes para que sus IDs
-- queden disponibles al insertar components/activities.
-- clerk_id usa placeholder; actualizar con el ID real de Clerk.
-- ------------------------------------------------------------
INSERT INTO users (id, clerk_id, department_id, title, first_name, last_name, email, is_active) VALUES
-- Líderes de componentes / actividades que no están en la lista de solicitantes
('00000000-0000-0000-0000-000000000001', 'placeholder_ebecerra',
    (SELECT id FROM departments WHERE name = 'INVESTIGACIÓN Y POSGRADO'),
    'Dr.', 'EDUARDO', 'BECERRA CORDOVA', 'ebecerra@placeholder.edu.mx', TRUE),

-- Solicitantes
('00000000-0000-0000-0000-000000000002', 'placeholder_jdominguez',
    (SELECT id FROM departments WHERE name = 'DIRECCIÓN GENERAL'),
    'Mtro.', 'JOSÉ CONCEPCIÓN', 'DOMINGUEZ LÓPEZ', 'jdominguez@placeholder.edu.mx', TRUE),

('00000000-0000-0000-0000-000000000003', 'placeholder_crojo',
    (SELECT id FROM departments WHERE name = 'RESIDENCIAS PROFESIONALES Y SERVICIO SOCIAL'),
    'C.P.', 'CARMEN', 'ROJO MONROY', 'crojo@placeholder.edu.mx', TRUE),

('00000000-0000-0000-0000-000000000004', 'placeholder_alopez',
    (SELECT id FROM departments WHERE name = 'INVESTIGACIÓN Y POSGRADO'),
    'Mtro.', 'AURELIO', 'LÓPEZ RODRÍGUEZ', 'alopez@placeholder.edu.mx', TRUE),

('00000000-0000-0000-0000-000000000005', 'placeholder_kgonzalez',
    (SELECT id FROM departments WHERE name = 'DIFUSIÓN, CULTURA Y DEPORTE'),
    'Mtra.', 'KAREN PAOLA', 'GONZÁLEZ RIVERO', 'kgonzalez@placeholder.edu.mx', TRUE),

('00000000-0000-0000-0000-000000000006', 'placeholder_flugo',
    (SELECT id FROM departments WHERE name = 'CIENCIAS BÁSICAS'),
    'Ing.', 'FRANK', 'LUGO MOTA', 'flugo@placeholder.edu.mx', TRUE),

('00000000-0000-0000-0000-000000000007', 'placeholder_bsanchez',
    (SELECT id FROM departments WHERE name = 'DESARROLLO ACADÉMICO'),
    'Lic.', 'BEATRIZ', 'SÁNCHEZ DELGADO', 'bsanchez@placeholder.edu.mx', TRUE),

('00000000-0000-0000-0000-000000000008', 'placeholder_rmontoya',
    (SELECT id FROM departments WHERE name = 'CONTROL ESCOLAR'),
    'Lis.', 'ROCIO', 'MONTOYA PÉREZ', 'rmontoya@placeholder.edu.mx', TRUE),

('00000000-0000-0000-0000-000000000009', 'placeholder_jcornejo',
    (SELECT id FROM departments WHERE name = 'INGENIERÍA EN TECNOLOGÍAS DE LA INFORMACIÓN Y COMUNICACIONES'),
    'Lic.', 'JUAN', 'CORNEJO HERNÁNDEZ', 'jcornejo@placeholder.edu.mx', TRUE),

('00000000-0000-0000-0000-000000000010', 'placeholder_ahernandez',
    (SELECT id FROM departments WHERE name = 'PLANEACIÓN Y VINCULACIÓN'),
    'Mtro.', 'ANGEL', 'HERNÁNDEZ CABRERA', 'ahernandez@placeholder.edu.mx', TRUE),

('00000000-0000-0000-0000-000000000011', 'placeholder_mordoñez',
    (SELECT id FROM departments WHERE name = 'VINCULACIÓN'),
    'Lic.', 'MICHELL', 'ORDOÑEZ CORNEJO', 'mordoñez@placeholder.edu.mx', TRUE),

('00000000-0000-0000-0000-000000000012', 'placeholder_bangeles',
    (SELECT id FROM departments WHERE name = 'PLANEACIÓN'),
    'Ing.', 'BERNARDO', 'ÁNGELES CRUZ', 'bangeles@placeholder.edu.mx', TRUE),

('00000000-0000-0000-0000-000000000013', 'placeholder_ameza',
    (SELECT id FROM departments WHERE name = 'SERVICIOS ADMINISTRATIVOS'),
    'Lic.', 'ARACELI', 'MEZA PÉREZ', 'ameza@placeholder.edu.mx', TRUE),

('00000000-0000-0000-0000-000000000014', 'placeholder_yrodriguez',
    (SELECT id FROM departments WHERE name = 'DESARROLLO DE PERSONAL'),
    'Mtra.', 'YANETH', 'RODRIGUEZ LÓPEZ', 'yrodriguez@placeholder.edu.mx', TRUE),

('00000000-0000-0000-0000-000000000015', 'placeholder_nramirez',
    (SELECT id FROM departments WHERE name = 'RECURSOS MATERIALES Y SERVICIOS'),
    'Ing.', 'NATALI', 'RAMÍREZ MENDOZA', 'nramirez@placeholder.edu.mx', TRUE),

('00000000-0000-0000-0000-000000000016', 'placeholder_aquintero',
    (SELECT id FROM departments WHERE name = 'INGENIERÍA INDUSTRIAL'),
    'Ing.', 'ANWAR', 'QUINTERO OCARIZ', 'aquintero@placeholder.edu.mx', TRUE),

('00000000-0000-0000-0000-000000000017', 'placeholder_egomez',
    (SELECT id FROM departments WHERE name = 'INGENIERÍA EN INDUSTRIAS ALIMENTARIAS'),
    'Dr.', 'ERIK', 'GÓMEZ HERNÁNDEZ', 'egomez@placeholder.edu.mx', TRUE),

('00000000-0000-0000-0000-000000000018', 'placeholder_mgarcia',
    (SELECT id FROM departments WHERE name = 'INGENIERÍA ELECTROMECANICA'),
    'Ing.', 'MARTIN', 'GARCÍA ÁNGELES', 'mgarcia@placeholder.edu.mx', TRUE),

('00000000-0000-0000-0000-000000000019', 'placeholder_rporras',
    (SELECT id FROM departments WHERE name = 'SUBDIRECCIÓN ACADÉMICA'),
    'Mtro.', 'ROLANDO', 'PORRAS MUÑOZ', 'rporras@placeholder.edu.mx', TRUE),

('00000000-0000-0000-0000-000000000020', 'placeholder_ebarrera',
    (SELECT id FROM departments WHERE name = 'INGENIERÍA EN GESTIÓN EMPRESARIAL'),
    'Mtra.', 'ESPERANZA', 'BARRERA PÉREZ', 'ebarrera@placeholder.edu.mx', TRUE),

('00000000-0000-0000-0000-000000000021', 'placeholder_vmartinez',
    (SELECT id FROM departments WHERE name = 'ARQUITECTURA'),
    'Arq.', 'VICTOR', 'MARTÍNEZ YBARRA', 'vmartinez@placeholder.edu.mx', TRUE),

('00000000-0000-0000-0000-000000000022', 'placeholder_malvarez',
    (SELECT id FROM departments WHERE name = 'INGENIERÍA EN LOGISTICA'),
    'Mtro.', 'MARIO', 'ÁLVAREZ GARCÍA', 'malvarez@placeholder.edu.mx', TRUE),

('00000000-0000-0000-0000-000000000023', 'placeholder_kjperez',
    (SELECT id FROM departments WHERE name = 'INVESTIGACIÓN Y POSGRADO'),
    'Dra.', 'KARLA JARETH', 'PÉREZ VIVEROS', 'kjperez@placeholder.edu.mx', TRUE),

('00000000-0000-0000-0000-000000000024', 'placeholder_camartinez',
    (SELECT id FROM departments WHERE name = 'INGENIERÍA EN SISTEMAS COMPUTACIONALES'),
    'Mtra.', 'CITLALI AZUCENA', 'MARTÍNEZ CALVA', 'camartinez@placeholder.edu.mx', TRUE);

-- ------------------------------------------------------------
-- components
-- administrative_unit_id mapeado al componente según dominio:
--   C1 → 1000 Dirección Académica
--   C2 → 2000 Dirección de Planeación y Vinculación
--   C3 → 3000 Subdirección de Posgrado e Investigación
--   C4 → 4000 Subdirección de Planeación
--   C5 → 5000 Subdirección de Servicios Administrativos
-- ------------------------------------------------------------
INSERT INTO components (code, name, administrative_unit_id, leader_id) VALUES
    ('C1', 'ESTUDIANTES DEL NIVEL SUPERIOR DE EDUCACIÓN EN INSTITUCIONES PÚBLICAS FORMADOS',
        (SELECT id FROM administrative_units WHERE code = '1000'),
        '00000000-0000-0000-0000-000000000002'),

    ('C2', 'SERVICIOS DE EXTENSIÓN Y VINCULACIÓN DE EDUCACIÓN SUPERIOR OTORGADOS',
        (SELECT id FROM administrative_units WHERE code = '2000'),
        '00000000-0000-0000-0000-000000000010'),

    ('C3', 'INVESTIGACIÓN CIENTÍFICA, TECNOLÓGICA Y EDUCATIVA DESARROLLADA',
        (SELECT id FROM administrative_units WHERE code = '3000'),
        '00000000-0000-0000-0000-000000000001'),

    ('C4', 'INSTRUMENTOS DE PLANEACIÓN ESTRATÉGICA EVALUADOS',
        (SELECT id FROM administrative_units WHERE code = '4000'),
        '00000000-0000-0000-0000-000000000012'),

    ('C5', 'NECESIDADES DE LA COMUNIDAD EDUCATIVA DE LAS INSTITUCIONES DE EDUCACIÓN SUPERIOR ATENDIDAS',
        (SELECT id FROM administrative_units WHERE code = '5000'),
        '00000000-0000-0000-0000-000000000013');

-- ------------------------------------------------------------
-- activities
-- ------------------------------------------------------------
INSERT INTO activities (component_id, code, name, leader_id) VALUES
    -- C1
    ((SELECT id FROM components WHERE code = 'C1'), 'C1A1',
        'SEGUIMIENTO AL PROCESO DE SERVICIO SOCIAL, RESIDENCIAS O ESTADÍAS PROFESIONALES E INTERNADO DE PREGRADO DEL ESTUDIANTADO',
        '00000000-0000-0000-0000-000000000003'),

    ((SELECT id FROM components WHERE code = 'C1'), 'C1A2',
        'ELABORACIÓN DE ESTUDIOS DE PERTINENCIA Y FACTIBILIDAD DE LA OFERTA EDUCATIVA DE EDUCACIÓN SUPERIOR',
        '00000000-0000-0000-0000-000000000004'),

    ((SELECT id FROM components WHERE code = 'C1'), 'C1A3',
        'EVALUACIÓN ACADÉMICA AL ESTUDIANTADO DE EDUCACIÓN SUPERIOR',
        '00000000-0000-0000-0000-000000000002'),

    ((SELECT id FROM components WHERE code = 'C1'), 'C1A4',
        'IMPARTICIÓN DE ACTIVIDADES EXTRACURRICULARES EN EDUCACIÓN SUPERIOR',
        '00000000-0000-0000-0000-000000000005'),

    ((SELECT id FROM components WHERE code = 'C1'), 'C1A5',
        'ATENCIÓN COMPENSATORIA A ESTUDIANTES DE EDUCACIÓN SUPERIOR',
        '00000000-0000-0000-0000-000000000006'),

    ((SELECT id FROM components WHERE code = 'C1'), 'C1A6',
        'CAPACITACIÓN DEL PERSONAL DOCENTE DE INSTITUCIONES DE EDUCACIÓN SUPERIOR',
        '00000000-0000-0000-0000-000000000007'),

    ((SELECT id FROM components WHERE code = 'C1'), 'C1A7',
        'OTORGAMIENTO DE BECAS INSTITUCIONALES A ESTUDIANTES DE EDUCACIÓN SUPERIOR',
        '00000000-0000-0000-0000-000000000008'),

    ((SELECT id FROM components WHERE code = 'C1'), 'C1A8',
        'DISTRIBUCIÓN DE MATERIAL DIDÁCTICO A DOCENTES DE EDUCACIÓN SUPERIOR',
        '00000000-0000-0000-0000-000000000009'),

    -- C2
    ((SELECT id FROM components WHERE code = 'C2'), 'C2A1',
        'OTORGAMIENTO DE SERVICIOS DE EDUCACIÓN CONTINUA Y TECNOLÓGICOS DE EDUCACIÓN SUPERIOR',
        '00000000-0000-0000-0000-000000000010'),

    ((SELECT id FROM components WHERE code = 'C2'), 'C2A2',
        'DIFUSIÓN INSTITUCIONAL DE EDUCACIÓN SUPERIOR',
        '00000000-0000-0000-0000-000000000005'),

    ((SELECT id FROM components WHERE code = 'C2'), 'C2A3',
        'OTORGAMIENTO DE ORIENTACIÓN PROFESIOGRÁFICA PARA LA EDUCACIÓN SUPERIOR',
        '00000000-0000-0000-0000-000000000005'),

    ((SELECT id FROM components WHERE code = 'C2'), 'C2A4',
        'FIRMA DE CONVENIOS DE COLABORACIÓN EN EDUCACIÓN SUPERIOR',
        '00000000-0000-0000-0000-000000000011'),

    -- C3
    ((SELECT id FROM components WHERE code = 'C3'), 'C3A1',
        'SELECCIÓN DE PROYECTOS DE INVESTIGACIÓN CIENTÍFICA Y TECNOLÓGICA DE EDUCACIÓN SUPERIOR',
        '00000000-0000-0000-0000-000000000001'),

    ((SELECT id FROM components WHERE code = 'C3'), 'C3A2',
        'DIVULGACIÓN DE INVESTIGACIÓN CIENTÍFICA Y TECNOLÓGICA DE EDUCACIÓN SUPERIOR',
        '00000000-0000-0000-0000-000000000001'),

    -- C4
    ((SELECT id FROM components WHERE code = 'C4'), 'C4A1',
        'APLICACIÓN DE EVALUACIONES INSTITUCIONALES A LOS PROGRAMAS EDUCATIVOS',
        '00000000-0000-0000-0000-000000000012'),

    ((SELECT id FROM components WHERE code = 'C4'), 'C4A2',
        'EVALUACIÓN A DOCENTES DE EDUCACIÓN SUPERIOR',
        '00000000-0000-0000-0000-000000000007'),

    ((SELECT id FROM components WHERE code = 'C4'), 'C4A3',
        'ACTUALIZACIÓN DE MÓDULOS DE SISTEMAS DE INFORMACIÓN EN LA INSTITUCIÓN EDUCATIVA',
        '00000000-0000-0000-0000-000000000012'),

    -- C5
    ((SELECT id FROM components WHERE code = 'C5'), 'C5A1',
        'CAPACITACIÓN A PERSONAL ADMINISTRATIVO DE EDUCACIÓN SUPERIOR',
        '00000000-0000-0000-0000-000000000014'),

    ((SELECT id FROM components WHERE code = 'C5'), 'C5A2',
        'UTILIZACIÓN DE LA CAPACIDAD FÍSICA INSTALADA PARA LAS ACTIVIDADES ACADÉMICAS EN INSTITUCIONES DE EDUCACIÓN SUPERIOR',
        '00000000-0000-0000-0000-000000000010'),

    ((SELECT id FROM components WHERE code = 'C5'), 'C5A3',
        'MANTENIMIENTO A LA INFRAESTRUCTURA FÍSICA EDUCATIVA DE EDUCACIÓN SUPERIOR',
        '00000000-0000-0000-0000-000000000015'),

    ((SELECT id FROM components WHERE code = 'C5'), 'C5A4',
        'EJECUCIÓN DE PROYECTOS DE INVERSIÓN',
        '00000000-0000-0000-0000-000000000012'),

    ((SELECT id FROM components WHERE code = 'C5'), 'C5A5',
        'ADMINISTRACIÓN DE RECAUDACIÓN DE INGRESOS PROPIOS',
        '00000000-0000-0000-0000-000000000013');
>>>>>>> cd6a34c (Borrador inserts)

-- migrate:down

DELETE FROM users
WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);

DELETE FROM roles
WHERE name IN ('SOLICITANTE', 'LIDER', 'SUFICIENCIA', 'ADMIN');

DELETE FROM departments
WHERE name IN ('Soporte Técnico', 'Planeación');


SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS product_items;
DROP TABLE IF EXISTS request_components;
DROP TABLE IF EXISTS purchase_requests;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS components;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS budget_items;
DROP TABLE IF EXISTS measurement_units;
DROP TABLE IF EXISTS funding_sources;
DROP TABLE IF EXISTS administrative_units;
DROP TABLE IF EXISTS departments;

SET FOREIGN_KEY_CHECKS = 1;
