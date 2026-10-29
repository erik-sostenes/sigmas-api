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
    ('ELECTROMECANICA'),
    ('LOGISTICA'),
    ('INGENIERÍA INDUSTRIAL'),
    ('INGENIERÍA EN INDUSTRIAS ALIMENTARIAS'),
    ('SUBDIRECCIÓN ACADÉMICA'),
    ('INGENIERÍA EN GESTIÓN EMPRESARIAL'),
    ('ARQUITECTURA'),
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
INSERT INTO users (clerk_id, department_id, title, first_name, last_name, email) VALUES
-- Líder de componente
('placeholder_ebecerra',
    (SELECT id FROM departments WHERE name = 'INVESTIGACIÓN Y POSGRADO'),
    'Dr.', 'EDUARDO', 'BECERRA CORDOVA', 'ebecerra@placeholder.edu.mx'),

-- Solicitantes
('placeholder_jdominguez',
    (SELECT id FROM departments WHERE name = 'DIRECCIÓN GENERAL'),
    'Mtro.', 'JOSÉ CONCEPCIÓN', 'DOMINGUEZ LÓPEZ', 'jdominguez@placeholder.edu.mx'),

('placeholder_crojo',
    (SELECT id FROM departments WHERE name = 'RESIDENCIAS PROFESIONALES Y SERVICIO SOCIAL'),
    'C.P.', 'CARMEN', 'ROJO MONROY', 'crojo@placeholder.edu.mx'),

('placeholder_alopez',
    (SELECT id FROM departments WHERE name = 'INVESTIGACIÓN Y POSGRADO'),
    'Mtro.', 'AURELIO', 'LÓPEZ RODRÍGUEZ', 'alopez@placeholder.edu.mx'),

('placeholder_kgonzalez',
    (SELECT id FROM departments WHERE name = 'DIFUSIÓN, CULTURA Y DEPORTE'),
    'Mtra.', 'KAREN PAOLA', 'GONZÁLEZ RIVERO', 'kgonzalez@placeholder.edu.mx'),

('placeholder_flugo',
    (SELECT id FROM departments WHERE name = 'CIENCIAS BÁSICAS'),
    'Ing.', 'FRANK', 'LUGO MOTA', 'flugo@placeholder.edu.mx'),

('placeholder_bsanchez',
    (SELECT id FROM departments WHERE name = 'DESARROLLO ACADÉMICO'),
    'Lic.', 'BEATRIZ', 'SÁNCHEZ DELGADO', 'bsanchez@placeholder.edu.mx'),

('placeholder_rmontoya',
    (SELECT id FROM departments WHERE name = 'CONTROL ESCOLAR'),
    'Lic.', 'ROCIO', 'MONTOYA PÉREZ', 'rmontoya@placeholder.edu.mx'),

('placeholder_jcornejo',
    (SELECT id FROM departments WHERE name = 'INGENIERÍA EN TECNOLOGÍAS DE LA INFORMACIÓN Y COMUNICACIONES'),
    'Lic.', 'JUAN', 'CORNEJO HERNÁNDEZ', 'jcornejo@placeholder.edu.mx'),

('placeholder_ahernandez',
    (SELECT id FROM departments WHERE name = 'PLANEACIÓN Y VINCULACIÓN'),
    'Mtro.', 'ANGEL', 'HERNÁNDEZ CABRERA', 'ahernandez@placeholder.edu.mx'),

('placeholder_mordonez',
    (SELECT id FROM departments WHERE name = 'VINCULACIÓN'),
    'Lic.', 'MICHELL', 'ORDOÑEZ CORNEJO', 'mordonez@placeholder.edu.mx'),

('placeholder_bangeles',
    (SELECT id FROM departments WHERE name = 'PLANEACIÓN'),
    'Ing.', 'BERNARDO', 'ÁNGELES CRUZ', 'bangeles@placeholder.edu.mx'),

('placeholder_ameza',
    (SELECT id FROM departments WHERE name = 'SERVICIOS ADMINISTRATIVOS'),
    'Lic.', 'ARACELI', 'MEZA PÉREZ', 'ameza@placeholder.edu.mx'),

('placeholder_yrodriguez',
    (SELECT id FROM departments WHERE name = 'DESARROLLO DE PERSONAL'),
    'Mtra.', 'YANETH', 'RODRIGUEZ LÓPEZ', 'yrodriguez@placeholder.edu.mx'),

('placeholder_nramirez',
    (SELECT id FROM departments WHERE name = 'RECURSOS MATERIALES Y SERVICIOS'),
    'Ing.', 'NATALI', 'RAMÍREZ MENDOZA', 'nramirez@placeholder.edu.mx'),

('placeholder_aquintero',
    (SELECT id FROM departments WHERE name = 'INGENIERÍA INDUSTRIAL'),
    'Ing.', 'ANWAR', 'QUINTERO OCARIZ', 'aquintero@placeholder.edu.mx'),

('placeholder_egomez',
    (SELECT id FROM departments WHERE name = 'INGENIERÍA EN INDUSTRIAS ALIMENTARIAS'),
    'Dr.', 'ERIK', 'GÓMEZ HERNÁNDEZ', 'egomez@placeholder.edu.mx'),

('placeholder_mgarcia',
    (SELECT id FROM departments WHERE name = 'INGENIERÍA ELECTROMECANICA'),
    'Ing.', 'MARTIN', 'GARCÍA ÁNGELES', 'mgarcia@placeholder.edu.mx'),

('placeholder_rporras',
    (SELECT id FROM departments WHERE name = 'SUBDIRECCIÓN ACADÉMICA'),
    'Mtro.', 'ROLANDO', 'PORRAS MUÑOZ', 'rporras@placeholder.edu.mx'),

('placeholder_ebarrera',
    (SELECT id FROM departments WHERE name = 'INGENIERÍA EN GESTIÓN EMPRESARIAL'),
    'Mtra.', 'ESPERANZA', 'BARRERA PÉREZ', 'ebarrera@placeholder.edu.mx'),

('placeholder_vmartinez',
    (SELECT id FROM departments WHERE name = 'ARQUITECTURA'),
    'Arq.', 'VICTOR', 'MARTÍNEZ YBARRA', 'vmartinez@placeholder.edu.mx'),

('placeholder_malvarez',
    (SELECT id FROM departments WHERE name = 'INGENIERÍA EN LOGISTICA'),
    'Mtro.', 'MARIO', 'ÁLVAREZ GARCÍA', 'malvarez@placeholder.edu.mx'),

('placeholder_kjperez',
    (SELECT id FROM departments WHERE name = 'INVESTIGACIÓN Y POSGRADO'),
    'Dra.', 'KARLA JARETH', 'PÉREZ VIVEROS', 'kjperez@placeholder.edu.mx'),

('placeholder_camartinez',
    (SELECT id FROM departments WHERE name = 'INGENIERÍA EN SISTEMAS COMPUTACIONALES'),
    'Mtra.', 'CITLALI AZUCENA', 'MARTÍNEZ CALVA', 'camartinez@placeholder.edu.mx');-- ------------------------------------------------------------

-- components
-- administrative_unit_id mapeado al componente según dominio:
--   C1 → 1000 Dirección Académica
--   C2 → 2000 Dirección de Planeación y Vinculación
--   C3 → 3000 Subdirección de Posgrado e Investigación
--   C4 → 4000 Subdirección de Planeación
--   C5 → 5000 Subdirección de Servicios Administrativos
-- TODO: checar si quedo bien asociado el lider con la actividad
-- ------------------------------------------------------------
INSERT INTO components (code, name, administrative_unit_id, leader_id) VALUES
    ('C1', 'ESTUDIANTES DEL NIVEL SUPERIOR DE EDUCACIÓN EN INSTITUCIONES PÚBLICAS FORMADOS',
        (SELECT id FROM administrative_units WHERE code = '1000'),
        (SELECT id FROM users WHERE email = 'jdominguez@placeholder.edu.mx')),

    ('C2', 'SERVICIOS DE EXTENSIÓN Y VINCULACIÓN DE EDUCACIÓN SUPERIOR OTORGADOS',
        (SELECT id FROM administrative_units WHERE code = '2000'),
        (SELECT id FROM users WHERE email = 'ahernandez@placeholder.edu.mx')),

    ('C3', 'INVESTIGACIÓN CIENTÍFICA, TECNOLÓGICA Y EDUCATIVA DESARROLLADA',
        (SELECT id FROM administrative_units WHERE code = '3000'),
        (SELECT id FROM users WHERE email = 'ebecerra@placeholder.edu.mx')),

    ('C4', 'INSTRUMENTOS DE PLANEACIÓN ESTRATÉGICA EVALUADOS',
        (SELECT id FROM administrative_units WHERE code = '4000'),
        (SELECT id FROM users WHERE email = 'bangeles@placeholder.edu.mx')),

    ('C5', 'NECESIDADES DE LA COMUNIDAD EDUCATIVA DE LAS INSTITUCIONES DE EDUCACIÓN SUPERIOR ATENDIDAS',
        (SELECT id FROM administrative_units WHERE code = '5000'),
        (SELECT id FROM users WHERE email = 'ameza@placeholder.edu.mx'));-- ------------------------------------------------------------

-- activities
-- NOTE: 23 actividades mapeadas (8 de C1, 4 de C2, 2 de C3, 3 de C4, 5 de C5).
-- WARNING: C2A2 y C2A3 tienen el mismo líder (Karen González, kgonzalez) — así estaba en tu original, solo lo señalo por si esperabas que fueran distintos.
-- WARNING: C3A1 y C3A2 tienen el mismo líder (Eduardo Becerra, ebecerra) — igual, consistente con tu original.
-- WARNING: C4A1 y C4A3 tienen el mismo líder (Bernardo Ángeles, bangeles) — consistente.
-- WARNING: C5A2 comparte líder con C2A1 (Ángel Hernández, ahernandez) — consistente.
-- ------------------------------------------------------------
INSERT INTO activities (component_id, code, name, leader_id) VALUES
    -- C1
    ((SELECT id FROM components WHERE code = 'C1'), 'C1A1',
        'SEGUIMIENTO AL PROCESO DE SERVICIO SOCIAL, RESIDENCIAS O ESTADÍAS PROFESIONALES E INTERNADO DE PREGRADO DEL ESTUDIANTADO',
        (SELECT id FROM users WHERE email = 'crojo@placeholder.edu.mx')),

    ((SELECT id FROM components WHERE code = 'C1'), 'C1A2',
        'ELABORACIÓN DE ESTUDIOS DE PERTINENCIA Y FACTIBILIDAD DE LA OFERTA EDUCATIVA DE EDUCACIÓN SUPERIOR',
        (SELECT id FROM users WHERE email = 'alopez@placeholder.edu.mx')),

    ((SELECT id FROM components WHERE code = 'C1'), 'C1A3',
        'EVALUACIÓN ACADÉMICA AL ESTUDIANTADO DE EDUCACIÓN SUPERIOR',
        (SELECT id FROM users WHERE email = 'jdominguez@placeholder.edu.mx')),

    ((SELECT id FROM components WHERE code = 'C1'), 'C1A4',
        'IMPARTICIÓN DE ACTIVIDADES EXTRACURRICULARES EN EDUCACIÓN SUPERIOR',
        (SELECT id FROM users WHERE email = 'kgonzalez@placeholder.edu.mx')),

    ((SELECT id FROM components WHERE code = 'C1'), 'C1A5',
        'ATENCIÓN COMPENSATORIA A ESTUDIANTES DE EDUCACIÓN SUPERIOR',
        (SELECT id FROM users WHERE email = 'flugo@placeholder.edu.mx')),

    ((SELECT id FROM components WHERE code = 'C1'), 'C1A6',
        'CAPACITACIÓN DEL PERSONAL DOCENTE DE INSTITUCIONES DE EDUCACIÓN SUPERIOR',
        (SELECT id FROM users WHERE email = 'bsanchez@placeholder.edu.mx')),

    ((SELECT id FROM components WHERE code = 'C1'), 'C1A7',
        'OTORGAMIENTO DE BECAS INSTITUCIONALES A ESTUDIANTES DE EDUCACIÓN SUPERIOR',
        (SELECT id FROM users WHERE email = 'rmontoya@placeholder.edu.mx')),

    ((SELECT id FROM components WHERE code = 'C1'), 'C1A8',
        'DISTRIBUCIÓN DE MATERIAL DIDÁCTICO A DOCENTES DE EDUCACIÓN SUPERIOR',
        (SELECT id FROM users WHERE email = 'jcornejo@placeholder.edu.mx')),

    -- C2
    ((SELECT id FROM components WHERE code = 'C2'), 'C2A1',
        'OTORGAMIENTO DE SERVICIOS DE EDUCACIÓN CONTINUA Y TECNOLÓGICOS DE EDUCACIÓN SUPERIOR',
        (SELECT id FROM users WHERE email = 'ahernandez@placeholder.edu.mx')),

    ((SELECT id FROM components WHERE code = 'C2'), 'C2A2',
        'DIFUSIÓN INSTITUCIONAL DE EDUCACIÓN SUPERIOR',
        (SELECT id FROM users WHERE email = 'kgonzalez@placeholder.edu.mx')),

    ((SELECT id FROM components WHERE code = 'C2'), 'C2A3',
        'OTORGAMIENTO DE ORIENTACIÓN PROFESIOGRÁFICA PARA LA EDUCACIÓN SUPERIOR',
        (SELECT id FROM users WHERE email = 'kgonzalez@placeholder.edu.mx')),

    ((SELECT id FROM components WHERE code = 'C2'), 'C2A4',
        'FIRMA DE CONVENIOS DE COLABORACIÓN EN EDUCACIÓN SUPERIOR',
        (SELECT id FROM users WHERE email = 'mordonez@placeholder.edu.mx')),

    -- C3
    ((SELECT id FROM components WHERE code = 'C3'), 'C3A1',
        'SELECCIÓN DE PROYECTOS DE INVESTIGACIÓN CIENTÍFICA Y TECNOLÓGICA DE EDUCACIÓN SUPERIOR',
        (SELECT id FROM users WHERE email = 'ebecerra@placeholder.edu.mx')),

    ((SELECT id FROM components WHERE code = 'C3'), 'C3A2',
        'DIVULGACIÓN DE INVESTIGACIÓN CIENTÍFICA Y TECNOLÓGICA DE EDUCACIÓN SUPERIOR',
        (SELECT id FROM users WHERE email = 'ebecerra@placeholder.edu.mx')),

    -- C4
    ((SELECT id FROM components WHERE code = 'C4'), 'C4A1',
        'APLICACIÓN DE EVALUACIONES INSTITUCIONALES A LOS PROGRAMAS EDUCATIVOS',
        (SELECT id FROM users WHERE email = 'bangeles@placeholder.edu.mx')),

    ((SELECT id FROM components WHERE code = 'C4'), 'C4A2',
        'EVALUACIÓN A DOCENTES DE EDUCACIÓN SUPERIOR',
        (SELECT id FROM users WHERE email = 'bsanchez@placeholder.edu.mx')),

    ((SELECT id FROM components WHERE code = 'C4'), 'C4A3',
        'ACTUALIZACIÓN DE MÓDULOS DE SISTEMAS DE INFORMACIÓN EN LA INSTITUCIÓN EDUCATIVA',
        (SELECT id FROM users WHERE email = 'bangeles@placeholder.edu.mx')),

    -- C5
    ((SELECT id FROM components WHERE code = 'C5'), 'C5A1',
        'CAPACITACIÓN A PERSONAL ADMINISTRATIVO DE EDUCACIÓN SUPERIOR',
        (SELECT id FROM users WHERE email = 'yrodriguez@placeholder.edu.mx')),

    ((SELECT id FROM components WHERE code = 'C5'), 'C5A2',
        'UTILIZACIÓN DE LA CAPACIDAD FÍSICA INSTALADA PARA LAS ACTIVIDADES ACADÉMICAS EN INSTITUCIONES DE EDUCACIÓN SUPERIOR',
        (SELECT id FROM users WHERE email = 'ahernandez@placeholder.edu.mx')),

    ((SELECT id FROM components WHERE code = 'C5'), 'C5A3',
        'MANTENIMIENTO A LA INFRAESTRUCTURA FÍSICA EDUCATIVA DE EDUCACIÓN SUPERIOR',
        (SELECT id FROM users WHERE email = 'nramirez@placeholder.edu.mx')),

    ((SELECT id FROM components WHERE code = 'C5'), 'C5A4',
        'EJECUCIÓN DE PROYECTOS DE INVERSIÓN',
        (SELECT id FROM users WHERE email = 'bangeles@placeholder.edu.mx')),

    ((SELECT id FROM components WHERE code = 'C5'), 'C5A5',
        'ADMINISTRACIÓN DE RECAUDACIÓN DE INGRESOS PROPIOS',
        (SELECT id FROM users WHERE email = 'ameza@placeholder.edu.mx'));


-- NOTE: falta los inserts de measurement_units.
-- NOTE: falta por definir las partidas presupuestales(budget_items)
-- NOTE: falta los inserts de los roles
