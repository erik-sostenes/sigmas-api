import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mariadb from 'mariadb';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(rootDir, '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error('No se encontró DATABASE_URL ni archivo .env en la raíz.');
  }
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    if (key === 'DATABASE_URL') {
      let value = trimmed.slice(eqIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      return value;
    }
  }
  throw new Error('DATABASE_URL no está definida en .env.');
}

function splitSchemaSql(sqlText) {
  const upMarker = '-- migrate:up';
  const downMarker = '-- migrate:down';
  const upIndex = sqlText.indexOf(upMarker);
  const downIndex = sqlText.indexOf(downMarker);
  if (upIndex === -1 || downIndex === -1 || downIndex <= upIndex) {
    throw new Error('El archivo de esquema no tiene marcadores -- migrate:up / -- migrate:down válidos.');
  }
  const upSql = sqlText.slice(upIndex + upMarker.length, downIndex).trim();
  const downSql = sqlText.slice(downIndex + downMarker.length).trim();
  return { upSql, downSql };
}

async function main() {
  const databaseUrl = loadDatabaseUrl();
  const url = new URL(databaseUrl);

  const conn = await mariadb.createConnection({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, '')),
    multipleStatements: true,
    allowPublicKeyRetrieval: true,
    bigIntAsNumber: true,
    insertIdAsNumber: true,
  });

  try {
    const schemaPath = path.join(rootDir, 'db', 'migrations', '20261027165413_schemas.sql');
    const insertsPath = path.join(rootDir, 'db', 'inserts.sql');
    const providersPath = path.join(rootDir, 'proveedores.json');

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    const { upSql, downSql } = splitSchemaSql(schemaSql);
    const insertsSql = fs.readFileSync(insertsPath, 'utf8');
    const providers = JSON.parse(fs.readFileSync(providersPath, 'utf8'));

    console.log('1. Eliminando tablas previas (-- migrate:down)...');
    await conn.query(downSql);

    console.log('2. Creando tablas desde 20261027165413_schemas.sql (-- migrate:up)...');
    await conn.query(upSql);

    console.log('3. Insertando catálogos base (db/inserts.sql)...');
    await conn.query(insertsSql);

    console.log(`4. Cargando ${providers.length} proveedores desde proveedores.json...`);
    for (const raw of providers) {
      const rfc = String(raw.rfc ?? '').trim().toUpperCase();
      const name = String(raw.nombre_proveedor ?? '').trim();
      const phone = raw.telefono ? String(raw.telefono).trim() : null;
      const email = raw.email ? String(raw.email).trim() : null;
      const bank = raw.banco ? String(raw.banco).trim() : null;
      const clabe = raw.cuenta_clabe ? String(raw.cuenta_clabe).trim() : null;
      const taxAddress = raw.domicilio_fiscal ? JSON.stringify(raw.domicilio_fiscal) : null;

      await conn.execute(
        `INSERT INTO providers (rfc, name, is_active, phone, email, bank, clabe, tax_address)
         VALUES (?, ?, TRUE, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           is_active = TRUE,
           phone = VALUES(phone),
           email = VALUES(email),
           bank = VALUES(bank),
           clabe = VALUES(clabe),
           tax_address = VALUES(tax_address)`,
        [rfc, name, phone, email, bank, clabe, taxAddress],
      );
    }

    // Prueba transaccional (con ROLLBACK) para verificar columna generada `folio` en original y subfolio.
    console.log('5. Verificando generación de folios (original y subfolio) en transacción...');
    await conn.beginTransaction();
    try {
      const [deptRow] = await conn.query('SELECT id FROM departments LIMIT 1');
      await conn.execute(
        `INSERT INTO users (id, clerk_id, department_id, first_name, last_name, email)
         VALUES ('00000000-0000-4000-8000-000000000099', 'test_clerk_seed', ?, 'Test', 'User', 'test_seed@example.com')`,
        [deptRow.id],
      );
      const [parentRow] = await conn.execute(
        `INSERT INTO purchase_requests (requested_by, justification, total_amount_estimated)
         VALUES ('00000000-0000-4000-8000-000000000099', 'Prueba folio', 100.00)
         RETURNING id, request_number, folio`,
      );
      const [childRow] = await conn.execute(
        `INSERT INTO purchase_requests (parent_request_id, request_number, segment_number, requested_by, status, justification, total_amount_estimated)
         VALUES (?, ?, 1, '00000000-0000-4000-8000-000000000099', 'AUTORIZA_SUFICIENCIA', 'Prueba subfolio', 50.00)
         RETURNING id, request_number, segment_number, folio`,
        [parentRow.id, parentRow.request_number],
      );
      if (parentRow.folio !== String(parentRow.request_number) || childRow.folio !== `${parentRow.request_number}-1`) {
        throw new Error(`Folio inesperado: parent=${parentRow.folio}, child=${childRow.folio}`);
      }
      console.log(`   OK: folio original='${parentRow.folio}', subfolio='${childRow.folio}'`);
    } finally {
      await conn.rollback();
    }

    const [provCount] = await conn.query('SELECT COUNT(*) AS total FROM providers');
    const [tables] = await conn.query('SHOW TABLES');
    console.log(`Listo: ${tables.length} tablas creadas, ${provCount.total} proveedores activos cargados.`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('Error al recrear la BD:', err.message);
  process.exit(1);
});
