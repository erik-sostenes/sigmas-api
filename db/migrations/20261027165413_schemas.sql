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

CREATE TABLE IF NOT EXISTS providers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    rfc VARCHAR(13) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    phone VARCHAR(25) NULL,
    email VARCHAR(254) NULL,
    bank VARCHAR(100) NULL,
    clabe VARCHAR(25) NULL,
    tax_address JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_providers_name (name),
    KEY idx_providers_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE if not exists purchase_requests (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    parent_request_id CHAR(36) NULL,
    request_number INT NOT NULL AUTO_INCREMENT,
    segment_number SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    folio VARCHAR(20) GENERATED ALWAYS AS (
      IF(segment_number = 0, CAST(request_number AS CHAR), CONCAT(request_number, '-', segment_number))
    ) STORED,
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
    awarded_provider_id INT UNSIGNED NULL,
    justification TEXT NOT NULL,
    total_amount_estimated DECIMAL(12,2) NOT NULL DEFAULT 0, 
    final_subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    final_iva DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    final_retention_iva DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    final_retention_isr DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_amount_final DECIMAL(12,2) NOT NULL DEFAULT 0,     
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_pr_number_segment (request_number, segment_number),
    UNIQUE KEY uq_pr_folio (folio),
    KEY idx_pr_parent (parent_request_id),
    KEY idx_pr_awarded_provider (awarded_provider_id),
    CONSTRAINT chk_pr_segment_parent CHECK (
      (parent_request_id IS NULL AND segment_number = 0)
      OR (parent_request_id IS NOT NULL AND segment_number > 0)
    ),
    CONSTRAINT chk_pr_final_subtotal CHECK (final_subtotal >= 0),
    CONSTRAINT chk_pr_final_iva CHECK (final_iva >= 0),
    CONSTRAINT chk_pr_final_retention_iva CHECK (final_retention_iva >= 0),
    CONSTRAINT chk_pr_final_retention_isr CHECK (final_retention_isr >= 0),
    CONSTRAINT fk_pr_parent FOREIGN KEY (parent_request_id) REFERENCES purchase_requests(id) ON DELETE RESTRICT,
    CONSTRAINT fk_pr_awarded_provider FOREIGN KEY (awarded_provider_id) REFERENCES providers(id) ON DELETE RESTRICT,
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
    -- microsegundos: dos decisiones en el mismo segundo conservan su orden
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    KEY idx_prh_request (purchase_request_id, created_at),
    CONSTRAINT chk_prh_rejection_justified CHECK (
      decision <> 'RECHAZADO' OR (justification IS NOT NULL AND TRIM(justification) <> '')
    ),
    FOREIGN KEY (purchase_request_id) REFERENCES purchase_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (request_component_id) REFERENCES request_components(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comparative_charts (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    purchase_request_id CHAR(36) NOT NULL UNIQUE,
    chart_date DATE NOT NULL,
    awarded_provider_id INT UNSIGNED NOT NULL,
    highest_score TINYINT UNSIGNED NOT NULL,
    awarded_justification TEXT NULL,
    delivery_date DATE NULL,
    created_by CHAR(36) NOT NULL,
    updated_by CHAR(36) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_cc_awarded_provider (awarded_provider_id),
    KEY idx_cc_created_by (created_by),
    KEY idx_cc_updated_by (updated_by),
    CONSTRAINT chk_cc_highest_score CHECK (highest_score BETWEEN 0 AND 45),
    CONSTRAINT fk_cc_purchase_request FOREIGN KEY (purchase_request_id) REFERENCES purchase_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_cc_awarded_provider FOREIGN KEY (awarded_provider_id) REFERENCES providers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_cc_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_cc_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comparative_chart_providers (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    comparative_chart_id CHAR(36) NOT NULL,
    provider_id INT UNSIGNED NOT NULL,
    position TINYINT UNSIGNED NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    iva DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    retention_iva DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    retention_isr DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_score TINYINT UNSIGNED NOT NULL DEFAULT 0,
    UNIQUE KEY uq_ccp_chart_provider (comparative_chart_id, provider_id),
    UNIQUE KEY uq_ccp_chart_position (comparative_chart_id, position),
    KEY idx_ccp_provider (provider_id),
    CONSTRAINT chk_ccp_position CHECK (position BETWEEN 1 AND 3),
    CONSTRAINT chk_ccp_subtotal CHECK (subtotal >= 0),
    CONSTRAINT chk_ccp_iva CHECK (iva >= 0),
    CONSTRAINT chk_ccp_retention_iva CHECK (retention_iva >= 0),
    CONSTRAINT chk_ccp_retention_isr CHECK (retention_isr >= 0),
    CONSTRAINT chk_ccp_total CHECK (total >= 0),
    CONSTRAINT chk_ccp_total_score CHECK (total_score BETWEEN 0 AND 45),
    CONSTRAINT fk_ccp_comparative_chart FOREIGN KEY (comparative_chart_id) REFERENCES comparative_charts(id) ON DELETE CASCADE,
    CONSTRAINT fk_ccp_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comparative_chart_items (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    comparative_chart_provider_id CHAR(36) NOT NULL,
    product_item_id CHAR(36) NOT NULL,
    unit_cost DECIMAL(12,2) NULL,
    total_cost DECIMAL(12,2) NULL,
    UNIQUE KEY uq_cci_chart_provider_product (comparative_chart_provider_id, product_item_id),
    KEY idx_cci_product_item (product_item_id),
    CONSTRAINT chk_cci_unit_cost CHECK (unit_cost IS NULL OR unit_cost >= 0),
    CONSTRAINT chk_cci_total_cost CHECK (total_cost IS NULL OR total_cost >= 0),
    CONSTRAINT chk_cci_quoted_pair CHECK ((unit_cost IS NULL AND total_cost IS NULL) OR (unit_cost IS NOT NULL AND total_cost IS NOT NULL)),
    CONSTRAINT fk_cci_chart_provider FOREIGN KEY (comparative_chart_provider_id) REFERENCES comparative_chart_providers(id) ON DELETE CASCADE,
    CONSTRAINT fk_cci_product_item FOREIGN KEY (product_item_id) REFERENCES product_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comparative_chart_evaluations (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    comparative_chart_provider_id CHAR(36) NOT NULL,
    criterion ENUM('PRECIO', 'TIEMPO_ENTREGA', 'TIEMPO_RESPUESTA', 'FINANCIAMIENTO', 'GARANTIA') NOT NULL,
    score TINYINT UNSIGNED NOT NULL,
    observation VARCHAR(500) NOT NULL,
    UNIQUE KEY uq_cce_chart_provider_criterion (comparative_chart_provider_id, criterion),
    CONSTRAINT chk_cce_score CHECK (score BETWEEN 0 AND 9),
    CONSTRAINT chk_cce_observation CHECK (TRIM(observation) <> ''),
    CONSTRAINT fk_cce_chart_provider FOREIGN KEY (comparative_chart_provider_id) REFERENCES comparative_chart_providers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- migrate:down

DROP TABLE IF EXISTS comparative_chart_evaluations;
DROP TABLE IF EXISTS comparative_chart_items;
DROP TABLE IF EXISTS comparative_chart_providers;
DROP TABLE IF EXISTS comparative_charts;
DROP TABLE IF EXISTS purchase_request_history;
DROP TABLE IF EXISTS product_items;
DROP TABLE IF EXISTS request_components;
DROP TABLE IF EXISTS purchase_request_isos;
DROP TABLE IF EXISTS purchase_requests;
DROP TABLE IF EXISTS providers;
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
