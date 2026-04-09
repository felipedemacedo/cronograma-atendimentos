const crypto = require('crypto');
const { Pool } = require('pg');
const { newDb } = require('pg-mem');

const schemaStatements = [
  `
    CREATE TABLE IF NOT EXISTS residencias (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      endereco TEXT DEFAULT '',
      valor_hora DOUBLE PRECISION,
      adicional_noturno INTEGER DEFAULT 0,
      percentual_noturno DOUBLE PRECISION DEFAULT NULL,
      adicional_feriado INTEGER DEFAULT 0,
      percentual_feriado DOUBLE PRECISION DEFAULT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS cuidadoras (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      valor_hora DOUBLE PRECISION,
      observacao TEXT DEFAULT '',
      dias_disponiveis TEXT DEFAULT '[0,1,2,3,4,5,6]',
      adicional_noturno INTEGER DEFAULT NULL,
      percentual_noturno DOUBLE PRECISION DEFAULT NULL,
      regime_clt INTEGER DEFAULT 0,
      adicional_feriado INTEGER DEFAULT NULL,
      percentual_feriado DOUBLE PRECISION DEFAULT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS cuidadora_residencia (
      cuidadora_id TEXT NOT NULL,
      residencia_id TEXT NOT NULL,
      valor_transporte DOUBLE PRECISION DEFAULT 9,
      PRIMARY KEY (cuidadora_id, residencia_id),
      FOREIGN KEY (cuidadora_id) REFERENCES cuidadoras(id) ON DELETE CASCADE,
      FOREIGN KEY (residencia_id) REFERENCES residencias(id) ON DELETE CASCADE
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS agendamentos (
      id TEXT PRIMARY KEY,
      residencia_id TEXT NOT NULL,
      cuidadora_id TEXT NOT NULL,
      data_inicio TEXT NOT NULL,
      hora_inicio TEXT NOT NULL,
      data_fim TEXT NOT NULL,
      hora_fim TEXT NOT NULL,
      FOREIGN KEY (residencia_id) REFERENCES residencias(id) ON DELETE CASCADE,
      FOREIGN KEY (cuidadora_id) REFERENCES cuidadoras(id) ON DELETE CASCADE
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS feriados (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      nome TEXT NOT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      residencia_ids TEXT DEFAULT '[]',
      cuidadora_ids TEXT DEFAULT '[]'
    )
  `,
];

function createPool() {
  if (process.env.NODE_ENV === 'test' && !process.env.DATABASE_URL) {
    const memoryDb = newDb();
    const adapter = memoryDb.adapters.createPg();
    return new adapter.Pool();
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não configurada. Defina a conexão do Postgres/Neon.');
  }

  const isLocalConnection = /localhost|127\.0\.0\.1/i.test(process.env.DATABASE_URL);

  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocalConnection ? false : { rejectUnauthorized: false },
    max: process.env.VERCEL ? 3 : 10,
    idleTimeoutMillis: 10000,
  });
}

const pool = createPool();

async function initializeDatabase() {
  for (const statement of schemaStatements) {
    await pool.query(statement);
  }

  await pool.query(
    `
      INSERT INTO usuarios (id, username, password, role, residencia_ids, cuidadora_ids)
      SELECT $1, 'admin', 'admin', 'admin_geral', '[]', '[]'
      WHERE NOT EXISTS (SELECT 1 FROM usuarios)
    `,
    [crypto.randomUUID()]
  );
}

const ready = initializeDatabase();

async function query(text, params = []) {
  await ready;
  return pool.query(text, params);
}

async function getClient() {
  await ready;
  return pool.connect();
}

async function close() {
  await pool.end();
}

module.exports = {
  query,
  getClient,
  close,
  ready,
};
