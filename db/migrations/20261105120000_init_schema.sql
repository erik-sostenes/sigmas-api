-- migrate:up
CREATE TABLE IF NOT EXISTS departments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS administrative_units (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS funding_sources (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS measurement_units (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS budget_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS isos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL UNIQUE
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

CREATE TABLE IF NOT EXISTS user_roles (
    user_id CHAR(36) NOT NULL,
    role_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
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
    UNIQUE KEY uk_activities_component_code (component_id, code),
    FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_components (
    user_id CHAR(36) NOT NULL,
    component_id INT UNSIGNED NOT NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, component_id),
    UNIQUE KEY uk_user_components_user_id (user_id),
    UNIQUE KEY uk_user_components_component_id (component_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_activities (
    user_id CHAR(36) NOT NULL,
    activity_id INT UNSIGNED NOT NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, activity_id),
    UNIQUE KEY uk_user_activities_activity_id (activity_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_requests (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    request_number INT AUTO_INCREMENT UNIQUE,
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
    isos JSON NOT NULL,
    justification TEXT NOT NULL,
    total_amount_estimated DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_amount_final DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (requested_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS request_components (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    purchase_request_id CHAR(36) NOT NULL,
    component_id INT UNSIGNED NOT NULL,
    activity_id INT UNSIGNED NOT NULL,
    funding_source_id INT UNSIGNED NOT NULL,
    estimated_amount DECIMAL(12,2) NOT NULL,
    final_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    UNIQUE KEY uk_request_component (purchase_request_id, component_id),
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
    estimated_price DECIMAL(12,2) NOT NULL,
    final_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (purchase_request_id) REFERENCES purchase_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (budget_item_id) REFERENCES budget_items(id),
    FOREIGN KEY (measurement_unit_id) REFERENCES measurement_units(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- migrate:down
DROP TABLE IF EXISTS product_items;
DROP TABLE IF EXISTS request_components;
DROP TABLE IF EXISTS purchase_requests;
DROP TABLE IF EXISTS user_activities;
DROP TABLE IF EXISTS user_components;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS components;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS isos;
DROP TABLE IF EXISTS budget_items;
DROP TABLE IF EXISTS measurement_units;
DROP TABLE IF EXISTS funding_sources;
DROP TABLE IF EXISTS administrative_units;
DROP TABLE IF EXISTS departments;

