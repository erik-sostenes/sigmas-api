-- migrate:up
CREATE TABLE if not exists isos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL        -- Ej. 'NOM-012-SCFI-1994 DEL SGC'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE if not exists departments ( 
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL unique 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE if not exists administrative_units ( 
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE if not exists funding_sources (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE if not exists measurement_units (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT null 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE if not exists budget_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, 
    code VARCHAR(10) NOT NULL UNIQUE, 
    name VARCHAR(255) NOT null 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS components (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    administrative_unit_id INT UNSIGNED NOT NULL,
    FOREIGN KEY (administrative_unit_id) REFERENCES administrative_units(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activities (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    component_id INT UNSIGNED NOT NULL,
    code VARCHAR(10) NOT NULL,
    name VARCHAR(255) NOT NULL,
    FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE,
    UNIQUE KEY uq_activity_component_code (component_id, code),
    UNIQUE KEY uq_activity_id_component (id, component_id) -- destino de la FK compuesta de request_components
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    clerk_id VARCHAR(100) COLLATE utf8mb4_bin NOT NULL UNIQUE,
    department_id INT UNSIGNED NOT NULL,
    component_id INT UNSIGNED NULL,
    title VARCHAR(30) NULL,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_component (component_id), -- un componente solo tiene un líder
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
    FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL UNIQUE,
    requires_activities BOOLEAN NOT NULL DEFAULT FALSE,
    requires_component BOOLEAN NOT NULL DEFAULT FALSE -- AGREGADO
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_roles (
    user_id CHAR(36) NOT NULL,
    role_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE if not exists user_activities (
    user_id CHAR(36) NOT NULL,
    activity_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (user_id, activity_id),
    UNIQUE KEY uq_user_activities_activity (activity_id), -- una actividad solo tiene un líder
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AGREGADO: Tabla de invitaciones
CREATE TABLE IF NOT EXISTS invitations (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    clerk_invitation_id VARCHAR(100) NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    department_id INT UNSIGNED NOT NULL,
    component_id INT UNSIGNED NULL,
    title VARCHAR(30) NOT NULL,
    role_ids JSON NOT NULL,
    activity_ids JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE if not exists purchase_requests (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    request_number INT AUTO_INCREMENT UNIQUE, 
    requested_by CHAR(36) NOT NULL,
    -- Estados y transiciones: docs/BUSINESS_RULES.md (sección 5)
    status ENUM(
      'SOLICITADO',
      'APRUEBA_LIDER',
      'RECHAZA_LIDER',
      'AUTORIZA_SUFICIENCIA',
      'RECHAZA_SUFICIENCIA',
      'EN_REVISION_RECURSOS',
      'PENDIENTE_APROBACION_SUFICIENCIA',
      'APRUEBA_SUFICIENCIA',
      'RECHAZA_SUFICIENCIA_FINAL',
      'APRUEBA_REVISION',
      'RECHAZA_REVISION',
      'AUTORIZA_DIRECCION',
      'RECHAZA_DIRECCION',
      'APRUEBA_FISCAL',
      'RECHAZA_FISCAL'
    ) NOT NULL DEFAULT 'SOLICITADO',
    purchase_type ENUM('COMPRA_MOSTRADOR', 'COMPRA_ADJ_DIRECTA', 'COMPRA_LICITACION', 'COMPRA_INVITACION') NULL,
    justification TEXT NOT NULL,
    total_amount_estimated DECIMAL(12,2) NOT NULL DEFAULT 0, 
    total_amount_final DECIMAL(12,2) NOT NULL DEFAULT 0,     
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (requested_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_request_isos (
    purchase_request_id CHAR(36) NOT NULL,
    iso_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (purchase_request_id, iso_id),
    FOREIGN KEY (purchase_request_id) REFERENCES purchase_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (iso_id) REFERENCES isos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS request_components (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    purchase_request_id CHAR(36) NOT NULL,
    component_id INT UNSIGNED NOT NULL,
    activity_id INT UNSIGNED NOT NULL,
    funding_source_id INT UNSIGNED NOT NULL,
    estimated_amount DECIMAL(12,2) NOT NULL,
    final_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    leader_id CHAR(36) NOT NULL, -- líder de la actividad, fijado al crear la solicitud
    leader_status ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',
    leader_decided_at TIMESTAMP NULL,
    UNIQUE KEY uq_request_component_activity_funding (purchase_request_id, component_id, activity_id, funding_source_id),
    KEY idx_rc_leader (leader_id),
    CONSTRAINT chk_rc_estimated CHECK (estimated_amount >= 0),
    CONSTRAINT chk_rc_final     CHECK (final_amount     >= 0),
    FOREIGN KEY (purchase_request_id) REFERENCES purchase_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_rc_component FOREIGN KEY (component_id) REFERENCES components(id),
    -- la actividad tiene que pertenecer al componente de la fila
    CONSTRAINT fk_rc_activity_component FOREIGN KEY (activity_id, component_id) REFERENCES activities(id, component_id),
    CONSTRAINT fk_rc_funding_source FOREIGN KEY (funding_source_id) REFERENCES funding_sources(id),
    CONSTRAINT fk_rc_leader FOREIGN KEY (leader_id) REFERENCES users(id)
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
    position SMALLINT UNSIGNED NOT NULL, -- orden en que lo capturó el solicitante (0, 1, 2…)
    UNIQUE KEY uq_product_item_position (purchase_request_id, position),
    CONSTRAINT chk_pi_quantity  CHECK (quantity        >  0),
    CONSTRAINT chk_pi_estimated CHECK (estimated_amount >= 0),
    CONSTRAINT chk_pi_final     CHECK (final_amount     >= 0),
    FOREIGN KEY (purchase_request_id) REFERENCES purchase_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (budget_item_id) REFERENCES budget_items(id),
    FOREIGN KEY (measurement_unit_id) REFERENCES measurement_units(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Una fila por cada decisión (aprobar / rechazar). Nunca se borra.
CREATE TABLE IF NOT EXISTS purchase_request_history (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    purchase_request_id CHAR(36) NOT NULL,
    request_component_id CHAR(36) NULL, -- obligatorio en decisiones de líder, NULL en las demás
    status_before ENUM(
      'SOLICITADO', 'APRUEBA_LIDER', 'RECHAZA_LIDER', 'AUTORIZA_SUFICIENCIA', 'RECHAZA_SUFICIENCIA',
      'EN_REVISION_RECURSOS', 'PENDIENTE_APROBACION_SUFICIENCIA', 'APRUEBA_SUFICIENCIA',
      'RECHAZA_SUFICIENCIA_FINAL', 'APRUEBA_REVISION', 'RECHAZA_REVISION', 'AUTORIZA_DIRECCION',
      'RECHAZA_DIRECCION', 'APRUEBA_FISCAL', 'RECHAZA_FISCAL'
    ) NOT NULL,
    status_after ENUM(
      'SOLICITADO', 'APRUEBA_LIDER', 'RECHAZA_LIDER', 'AUTORIZA_SUFICIENCIA', 'RECHAZA_SUFICIENCIA',
      'EN_REVISION_RECURSOS', 'PENDIENTE_APROBACION_SUFICIENCIA', 'APRUEBA_SUFICIENCIA',
      'RECHAZA_SUFICIENCIA_FINAL', 'APRUEBA_REVISION', 'RECHAZA_REVISION', 'AUTORIZA_DIRECCION',
      'RECHAZA_DIRECCION', 'APRUEBA_FISCAL', 'RECHAZA_FISCAL'
    ) NULL, -- NULL si la decisión no cambió el estado de la solicitud
    decision ENUM('APROBADO', 'RECHAZADO') NOT NULL,
    user_id CHAR(36) NOT NULL, -- quien registra la decisión en el sistema
    signer_name VARCHAR(150) NULL, -- solo en capturas de firmas físicas
    justification TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_prh_request (purchase_request_id, created_at),
    CONSTRAINT chk_prh_rejection_justified CHECK (
      decision <> 'RECHAZADO' OR (justification IS NOT NULL AND TRIM(justification) <> '')
    ),
    FOREIGN KEY (purchase_request_id) REFERENCES purchase_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (request_component_id) REFERENCES request_components(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- migrate:down

DROP TABLE IF EXISTS purchase_request_history;
DROP TABLE IF EXISTS product_items;
DROP TABLE IF EXISTS request_components;
DROP TABLE IF EXISTS purchase_request_isos;
DROP TABLE IF EXISTS purchase_requests;
DROP TABLE IF EXISTS invitations;
DROP TABLE IF EXISTS user_activities;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS components;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS budget_items;
DROP TABLE IF EXISTS measurement_units;
DROP TABLE IF EXISTS funding_sources;
DROP TABLE IF EXISTS administrative_units;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS isos;
