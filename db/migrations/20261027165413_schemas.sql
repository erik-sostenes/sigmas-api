-- migrate:up
CREATE TABLE if not exists departments ( -- falta -> 
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL unique -- 'Soporte Técnico' -> 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE if not exists administrative_units ( -- ya lo tenemos
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; ;
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

CREATE TABLE if not exists budget_items ( -- ya lo tenemos pero definir cuales son realmente las utilies
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, -- partidas presupuestal ......
    code VARCHAR(10) NOT NULL UNIQUE, -- Ej. 247001
    name VARCHAR(255) NOT null -- Artículos metálicos para la construcción 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    clerk_id VARCHAR(100) COLLATE utf8mb4_bin NOT NULL UNIQUE,
    department_id INT UNSIGNED NOT NULL,
    title VARCHAR(30) NULL,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
