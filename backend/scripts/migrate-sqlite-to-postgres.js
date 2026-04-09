const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const db = require('../database');

const SQLITE_PATH = path.resolve(__dirname, '..', 'database.sqlite');

function readAll(sourceDb, table) {
  return sourceDb.prepare(`SELECT * FROM ${table}`).all();
}

function buildMissingCaregiverRows(schedules, caregivers) {
  const caregiverIds = new Set(caregivers.map((caregiver) => caregiver.id));
  const missingIds = [...new Set(
    schedules
      .map((schedule) => schedule.cuidadora_id)
      .filter((id) => id && !caregiverIds.has(id))
  )];

  return missingIds.map((id) => ({
    id,
    nome: `Profissional migrado (${id.slice(0, 8)})`,
    valor_hora: null,
    observacao: 'Registro criado automaticamente durante migracao do SQLite.',
    dias_disponiveis: '[0,1,2,3,4,5,6]',
    adicional_noturno: null,
    percentual_noturno: null,
    regime_clt: 0,
    adicional_feriado: null,
    percentual_feriado: null,
  }));
}

async function migrate() {
  const sourceDb = new DatabaseSync(SQLITE_PATH);
  const residences = readAll(sourceDb, 'residencias');
  const caregivers = readAll(sourceDb, 'cuidadoras');
  const caregiverResidences = readAll(sourceDb, 'cuidadora_residencia');
  const schedules = readAll(sourceDb, 'agendamentos');
  const holidays = readAll(sourceDb, 'feriados');
  const users = readAll(sourceDb, 'usuarios');
  sourceDb.close();

  const missingCaregivers = buildMissingCaregiverRows(schedules, caregivers);
  const allCaregivers = [...caregivers, ...missingCaregivers];

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    await client.query(`
      TRUNCATE TABLE
        agendamentos,
        cuidadora_residencia,
        feriados,
        usuarios,
        cuidadoras,
        residencias
      RESTART IDENTITY CASCADE
    `);

    for (const row of residences) {
      await client.query(
        `
          INSERT INTO residencias (
            id, nome, endereco, valor_hora, adicional_noturno, percentual_noturno, adicional_feriado, percentual_feriado
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          row.id,
          row.nome,
          row.endereco || '',
          row.valor_hora,
          row.adicional_noturno ?? 0,
          row.percentual_noturno,
          row.adicional_feriado ?? 0,
          row.percentual_feriado,
        ]
      );
    }

    for (const row of allCaregivers) {
      await client.query(
        `
          INSERT INTO cuidadoras (
            id, nome, valor_hora, observacao, dias_disponiveis, adicional_noturno,
            percentual_noturno, regime_clt, adicional_feriado, percentual_feriado
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          row.id,
          row.nome,
          row.valor_hora,
          row.observacao || '',
          row.dias_disponiveis || '[0,1,2,3,4,5,6]',
          row.adicional_noturno,
          row.percentual_noturno,
          row.regime_clt ?? 0,
          row.adicional_feriado,
          row.percentual_feriado,
        ]
      );
    }

    for (const row of caregiverResidences) {
      await client.query(
        `
          INSERT INTO cuidadora_residencia (cuidadora_id, residencia_id, valor_transporte)
          VALUES ($1, $2, $3)
        `,
        [row.cuidadora_id, row.residencia_id, row.valor_transporte ?? 9]
      );
    }

    for (const row of schedules) {
      await client.query(
        `
          INSERT INTO agendamentos (
            id, residencia_id, cuidadora_id, data_inicio, hora_inicio, data_fim, hora_fim
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          row.id,
          row.residencia_id,
          row.cuidadora_id,
          row.data_inicio,
          row.hora_inicio,
          row.data_fim,
          row.hora_fim,
        ]
      );
    }

    for (const row of holidays) {
      await client.query(
        'INSERT INTO feriados (id, data, nome) VALUES ($1, $2, $3)',
        [row.id, row.data, row.nome]
      );
    }

    for (const row of users) {
      await client.query(
        `
          INSERT INTO usuarios (id, username, password, role, residencia_ids, cuidadora_ids)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          row.id,
          row.username,
          row.password,
          row.role,
          row.residencia_ids || '[]',
          row.cuidadora_ids || '[]',
        ]
      );
    }

    await client.query('COMMIT');

    console.log(`Migracao concluida.`);
    console.log(`residencias: ${residences.length}`);
    console.log(`cuidadoras: ${caregivers.length}`);
    console.log(`cuidadoras_placeholder: ${missingCaregivers.length}`);
    console.log(`cuidadora_residencia: ${caregiverResidences.length}`);
    console.log(`agendamentos: ${schedules.length}`);
    console.log(`feriados: ${holidays.length}`);
    console.log(`usuarios: ${users.length}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await db.close();
  }
}

migrate().catch((error) => {
  console.error('Falha na migracao:', error);
  process.exit(1);
});
