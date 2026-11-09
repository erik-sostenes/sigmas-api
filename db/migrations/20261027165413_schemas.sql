-- migrate:up
CREATE TABLE if not exists isos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL        -- Ej. 'NOM-012-SCFI-1994 DEL SGC'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE if not exists departments ( -- falta -> 
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL unique -- 'Soporte Técnico' -> 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE if not exists administrative_units ( -- ya lo tenemos
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
 -- 1000 <-> 'Dirección Académica', 2000 <-> 'Dirección de Planeación y Vinculación', 3000 <->'Subdirección de Posgrado e Investigación',
 -- 'Subdirección de Planeación', 'Subdirección de Servicios Administrativos'

CREATE TABLE if not exists funding_sources (-- Ya lo tenemos...
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- ('11', 'Recurso Fiscal'), ('14', 'Ingresos propios'), ('25', 'Recurso Federal')

CREATE TABLE if not exists measurement_units ( -- Ya lo tenemos...
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT null -- BULTO, CAJA, CENTIMETRO, ETC. 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- partidas presupuestales
CREATE TABLE if not exists budget_items ( -- ya lo tenemos pero definir cuales son realmente las utilies
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, 
    code VARCHAR(10) NOT NULL UNIQUE, -- Ej. 247001
    name VARCHAR(255) NOT null -- Artículos metálicos para la construcción 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    clerk_id VARCHAR(100) COLLATE utf8mb4_bin NOT NULL UNIQUE,
    department_id INT UNSIGNED NOT NULL,
    title VARCHAR(30) NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE if not exists roles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE if not exists user_roles (
    user_id CHAR(36) NOT NULL,
    role_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE if not exists components ( -- ya lo tenemos 
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,         -- Ej. C1, 01
    name VARCHAR(255) NOT NULL, -- ESTUDIANTES DEL NIVEL SUPERIOR DE EDUCACIÓN EN INSTITUCIONES PÚBLICAS FORMADOS
    administrative_unit_id INT UNSIGNED NOT NULL, 
    leader_id CHAR(36) NOT NULL,             
    FOREIGN KEY (administrative_unit_id) REFERENCES administrative_units(id),
    FOREIGN KEY (leader_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE if not exists activities ( -- ya lo tenemos
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    component_id INT UNSIGNED NOT NULL,
    code VARCHAR(10) NOT NULL UNIQUE,       
    name VARCHAR(255) NOT NULL,
    leader_id CHAR(36) NOT NULL,             
    FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE,
    FOREIGN KEY (leader_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE if not exists purchase_requests (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    request_number INT AUTO_INCREMENT UNIQUE, -- folio
    requested_by CHAR(36) NOT NULL,
    status ENUM(
      'SOLICITADO',
      'APRUEBA_LIDER', 
      'RECHAZA_LIDER',
      'AUTORIZA_SUFICIENCIA',
      'RECHAZA_SUFICIENCIA',
      'EN_REVISION_RECURSOS',
      'RECHAZA_RECURSOS',
      'PENDIENTE_APROBACION_SUFICIENCIA',
      'APRUEBA_SUFICIENCIA'
    ) NOT NULL DEFAULT 'SOLICITADO',
    purchase_type ENUM('COMPRA_MOSTRADOR', 'COMPRA_ADJ_DIRECTA', 'COMPRA_LICITACION', 'COMPRA_INVITACION') NULL,
    iso_id INT UNSIGNED NOT NULL,
    justification TEXT NOT NULL,
    total_amount_estimated DECIMAL(12,2) NOT NULL DEFAULT 0, 
    total_amount_final DECIMAL(12,2) NOT NULL DEFAULT 0,     
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (requested_by) REFERENCES users(id),
    FOREIGN KEY (iso_id) REFERENCES isos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS request_components (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    purchase_request_id CHAR(36) NOT NULL,
    component_id INT UNSIGNED NOT NULL,
    activity_id INT UNSIGNED NOT NULL,
    funding_source_id INT UNSIGNED NOT NULL,
    estimated_amount DECIMAL(12,2) NOT NULL,
    final_amount DECIMAL(12,2) NOT NULL DEFAULT 0,        -- captura manual
    UNIQUE KEY uq_request_component_activity(purchase_request_id, component_id, activity_id),
    CONSTRAINT chk_rc_estimated CHECK (estimated_amount >= 0),
    CONSTRAINT chk_rc_final     CHECK (final_amount     >= 0),
    FOREIGN KEY (purchase_request_id) REFERENCES purchase_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (component_id) REFERENCES components(id),
    FOREIGN KEY (activity_id) REFERENCES activities(id),
    FOREIGN KEY (funding_source_id) REFERENCES funding_sources(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_items (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    purchase_request_id CHAR(36) NOT NULL,
    budget_item_id INT UNSIGNED NOT NULL,
    measurement_unit_id INT UNSIGNED NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    description VARCHAR(500) NOT NULL,
    estimated_amount DECIMAL(12,2) NOT NULL,
    final_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    CONSTRAINT chk_pi_quantity  CHECK (quantity        >  0),
    CONSTRAINT chk_pi_estimated CHECK (estimated_amount >= 0),
    CONSTRAINT chk_pi_final     CHECK (final_amount     >= 0),
    FOREIGN KEY (purchase_request_id) REFERENCES purchase_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (budget_item_id) REFERENCES budget_items(id),
    FOREIGN KEY (measurement_unit_id) REFERENCES measurement_units(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Departamento (requerido por users.department_id)
INSERT INTO departments (id, name) VALUES
  (1, 'Soporte Técnico');

-- ISO (requerido por purchase_requests.iso_id)
INSERT INTO isos (id, name) VALUES
  (1, 'NOM-012-SCFI-1994 DEL SGC');

-- Unidad administrativa (requerido por components.administrative_unit_id)
INSERT INTO administrative_units (id, code, name) VALUES
  (1, '1000', 'Dirección Académica');

-- Fuentes de financiamiento
INSERT INTO funding_sources (id, code, name) VALUES
  (1, '11', 'Recurso Fiscal'),
  (2, '14', 'Ingresos propios');

-- Partidas presupuestales
INSERT INTO budget_items (id, code, name) VALUES
  (1, '247001', 'Artículos metálicos para la construcción'),
  (2, '515001', 'Equipo de cómputo y tecnologías de la información');

-- Unidades de medida
INSERT INTO measurement_units (id, name) VALUES
  (1, 'PIEZA'),
  (2, 'CAJA');

INSERT INTO users (id, clerk_id, department_id, title, email) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'clerk_test_user_01',
  1,
  'Ing.',
  'test@example.com'
);

INSERT INTO components (id, code, name, administrative_unit_id, leader_id) VALUES
  (1, 'C1', 'Estudiantes del nivel superior formados',     1, '550e8400-e29b-41d4-a716-446655440000'),
  (2, 'C2', 'Componente secundario de prueba',             1, '550e8400-e29b-41d4-a716-446655440000');

INSERT INTO activities (id, component_id, code, name, leader_id) VALUES
  (1, 1, 'A1', 'Actividad 1 del componente 1', '550e8400-e29b-41d4-a716-446655440000'),
  (2, 1, 'A2', 'Actividad 2 del componente 1', '550e8400-e29b-41d4-a716-446655440000'),
  (3, 2, 'A3', 'Actividad 1 del componente 2', '550e8400-e29b-41d4-a716-446655440000');

-- migrate:down
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
DROP TABLE IF EXISTS isos; 
