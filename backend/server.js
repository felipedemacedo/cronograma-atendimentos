const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const db = require('./database');

const app = express();
const PORT = 3000;

const uuidv4 = () => crypto.randomUUID();

app.use(cors());
app.use(express.json());

function asyncHandler(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  };
}

function parseJsonArray(value, fallback = []) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeResidencePayload(body) {
  return {
    nome: body.nome,
    endereco: body.endereco || '',
    valor_hora: body.valor_hora !== undefined && body.valor_hora !== '' ? body.valor_hora : 10,
    adicional_noturno: body.adicional_noturno ? 1 : 0,
    percentual_noturno: body.percentual_noturno !== undefined && body.percentual_noturno !== '' ? parseFloat(body.percentual_noturno) : 20,
    adicional_feriado: body.adicional_feriado ? 1 : 0,
    percentual_feriado: body.percentual_feriado !== undefined && body.percentual_feriado !== '' ? parseFloat(body.percentual_feriado) : 20,
  };
}

function normalizeCaregiverPayload(body) {
  return {
    nome: body.nome,
    valor_hora: body.valor_hora !== undefined && body.valor_hora !== '' ? body.valor_hora : null,
    observacao: body.observacao || '',
    dias_disponiveis: body.dias_disponiveis ? JSON.stringify(body.dias_disponiveis) : '[0,1,2,3,4,5,6]',
    adicional_noturno: body.adicional_noturno !== undefined && body.adicional_noturno !== '' ? parseInt(body.adicional_noturno, 10) : null,
    percentual_noturno: body.percentual_noturno !== undefined && body.percentual_noturno !== '' ? parseFloat(body.percentual_noturno) : null,
    regime_clt: body.regime_clt ? 1 : 0,
    adicional_feriado: body.adicional_feriado !== undefined && body.adicional_feriado !== '' ? parseInt(body.adicional_feriado, 10) : null,
    percentual_feriado: body.percentual_feriado !== undefined && body.percentual_feriado !== '' ? parseFloat(body.percentual_feriado) : null,
    configs: body.residencias_config || (body.residencia_ids || []).map((id) => ({ id, valor_transporte: 9 })),
  };
}

function serializeCaregiverResponse(id, payload) {
  return {
    id,
    nome: payload.nome,
    valor_hora: payload.valor_hora,
    observacao: payload.observacao,
    dias_disponiveis: parseJsonArray(payload.dias_disponiveis, [0, 1, 2, 3, 4, 5, 6]),
    regime_clt: payload.regime_clt === 1,
    residencia_ids: payload.configs.map((config) => config.id),
    residencias_config: payload.configs,
  };
}

async function replaceCaregiverResidences(client, caregiverId, configs) {
  await client.query('DELETE FROM cuidadora_residencia WHERE cuidadora_id = $1', [caregiverId]);

  for (const config of configs) {
    await client.query(
      `
        INSERT INTO cuidadora_residencia (cuidadora_id, residencia_id, valor_transporte)
        VALUES ($1, $2, $3)
      `,
      [
        caregiverId,
        config.id,
        config.valor_transporte !== undefined && config.valor_transporte !== '' ? config.valor_transporte : 9,
      ]
    );
  }
}

app.get('/api/residences', asyncHandler(async (_req, res) => {
  const result = await db.query('SELECT * FROM residencias ORDER BY nome ASC');
  res.json(result.rows);
}));

app.post('/api/residences', asyncHandler(async (req, res) => {
  const payload = normalizeResidencePayload(req.body);
  if (!payload.nome) {
    return res.status(400).json({ error: 'Nome e obrigatorio' });
  }

  const id = uuidv4();

  await db.query(
    `
      INSERT INTO residencias (
        id, nome, endereco, valor_hora, adicional_noturno, percentual_noturno, adicional_feriado, percentual_feriado
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      id,
      payload.nome,
      payload.endereco,
      payload.valor_hora,
      payload.adicional_noturno,
      payload.percentual_noturno,
      payload.adicional_feriado,
      payload.percentual_feriado,
    ]
  );

  res.status(201).json({ id, ...payload });
}));

app.put('/api/residences/:id', asyncHandler(async (req, res) => {
  const payload = normalizeResidencePayload(req.body);
  const result = await db.query(
    `
      UPDATE residencias
      SET nome = $1, endereco = $2, valor_hora = $3, adicional_noturno = $4,
          percentual_noturno = $5, adicional_feriado = $6, percentual_feriado = $7
      WHERE id = $8
    `,
    [
      payload.nome,
      payload.endereco,
      payload.valor_hora,
      payload.adicional_noturno,
      payload.percentual_noturno,
      payload.adicional_feriado,
      payload.percentual_feriado,
      req.params.id,
    ]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Residencia nao encontrada' });
  }

  res.json({ id: req.params.id, ...payload });
}));

app.delete('/api/residences/:id', asyncHandler(async (req, res) => {
  const result = await db.query('DELETE FROM residencias WHERE id = $1', [req.params.id]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Residencia nao encontrada' });
  }

  res.status(204).send();
}));

app.get('/api/caregivers', asyncHandler(async (_req, res) => {
  const caregiversResult = await db.query('SELECT * FROM cuidadoras ORDER BY nome ASC');
  const relationsResult = await db.query('SELECT * FROM cuidadora_residencia');

  const caregivers = caregiversResult.rows.map((caregiver) => {
    const caregiverRelations = relationsResult.rows.filter((relation) => relation.cuidadora_id === caregiver.id);

    return {
      ...caregiver,
      dias_disponiveis: parseJsonArray(caregiver.dias_disponiveis, [0, 1, 2, 3, 4, 5, 6]),
      residencia_ids: caregiverRelations.map((relation) => relation.residencia_id),
      residencias_config: caregiverRelations.map((relation) => ({
        id: relation.residencia_id,
        valor_transporte: relation.valor_transporte,
      })),
    };
  });

  res.json(caregivers);
}));

app.post('/api/caregivers', asyncHandler(async (req, res) => {
  const payload = normalizeCaregiverPayload(req.body);
  if (!payload.nome) {
    return res.status(400).json({ error: 'Nome e obrigatorio' });
  }

  const id = uuidv4();
  const client = await db.getClient();

  try {
    await client.query('BEGIN');
    await client.query(
      `
        INSERT INTO cuidadoras (
          id, nome, valor_hora, observacao, dias_disponiveis, adicional_noturno,
          percentual_noturno, regime_clt, adicional_feriado, percentual_feriado
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        id,
        payload.nome,
        payload.valor_hora,
        payload.observacao,
        payload.dias_disponiveis,
        payload.adicional_noturno,
        payload.percentual_noturno,
        payload.regime_clt,
        payload.adicional_feriado,
        payload.percentual_feriado,
      ]
    );

    await replaceCaregiverResidences(client, id, payload.configs);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  res.status(201).json(serializeCaregiverResponse(id, payload));
}));

app.put('/api/caregivers/:id', asyncHandler(async (req, res) => {
  const payload = normalizeCaregiverPayload(req.body);
  const client = await db.getClient();

  try {
    await client.query('BEGIN');
    const result = await client.query(
      `
        UPDATE cuidadoras
        SET nome = $1, valor_hora = $2, observacao = $3, dias_disponiveis = $4,
            adicional_noturno = $5, percentual_noturno = $6, regime_clt = $7,
            adicional_feriado = $8, percentual_feriado = $9
        WHERE id = $10
      `,
      [
        payload.nome,
        payload.valor_hora,
        payload.observacao,
        payload.dias_disponiveis,
        payload.adicional_noturno,
        payload.percentual_noturno,
        payload.regime_clt,
        payload.adicional_feriado,
        payload.percentual_feriado,
        req.params.id,
      ]
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cuidadora nao encontrada' });
    }

    await replaceCaregiverResidences(client, req.params.id, payload.configs);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  res.json(serializeCaregiverResponse(req.params.id, payload));
}));

app.delete('/api/caregivers/:id', asyncHandler(async (req, res) => {
  const result = await db.query('DELETE FROM cuidadoras WHERE id = $1', [req.params.id]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Cuidadora nao encontrada' });
  }

  res.status(204).send();
}));

app.get('/api/schedules', asyncHandler(async (_req, res) => {
  const result = await db.query(
    `
      SELECT
        a.*,
        r.nome AS residencia_nome,
        r.valor_hora AS residencia_valor_hora,
        r.adicional_noturno AS residencia_adicional_noturno,
        r.percentual_noturno AS residencia_percentual_noturno,
        r.adicional_feriado AS residencia_adicional_feriado,
        r.percentual_feriado AS residencia_percentual_feriado,
        c.nome AS cuidadora_nome,
        c.valor_hora AS cuidadora_valor_hora,
        c.regime_clt AS cuidadora_regime_clt,
        c.adicional_noturno AS cuidadora_adicional_noturno,
        c.percentual_noturno AS cuidadora_percentual_noturno,
        c.adicional_feriado AS cuidadora_adicional_feriado,
        c.percentual_feriado AS cuidadora_percentual_feriado,
        COALESCE(cr.valor_transporte, 9) AS valor_transporte
      FROM agendamentos a
      JOIN residencias r ON a.residencia_id = r.id
      JOIN cuidadoras c ON a.cuidadora_id = c.id
      LEFT JOIN cuidadora_residencia cr
        ON a.cuidadora_id = cr.cuidadora_id AND a.residencia_id = cr.residencia_id
      ORDER BY a.data_inicio ASC, a.hora_inicio ASC
    `
  );

  res.json(result.rows);
}));

app.post('/api/schedules/batch', asyncHandler(async (req, res) => {
  const { schedules } = req.body;
  if (!Array.isArray(schedules) || schedules.length === 0) {
    return res.status(400).json({ error: 'Lista de agendamentos invalida' });
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');
    for (const schedule of schedules) {
      await client.query(
        `
          INSERT INTO agendamentos (
            id, residencia_id, cuidadora_id, data_inicio, hora_inicio, data_fim, hora_fim
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          uuidv4(),
          schedule.residencia_id,
          schedule.cuidadora_id,
          schedule.data_inicio,
          schedule.hora_inicio,
          schedule.data_fim,
          schedule.hora_fim,
        ]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  res.status(201).json({ message: 'Agendamentos criados com sucesso' });
}));

app.put('/api/schedules/:id', asyncHandler(async (req, res) => {
  const { data_inicio, hora_inicio, data_fim, hora_fim, cuidadora_id } = req.body;

  const result = await db.query(
    `
      UPDATE agendamentos
      SET data_inicio = $1, hora_inicio = $2, data_fim = $3, hora_fim = $4, cuidadora_id = $5
      WHERE id = $6
    `,
    [data_inicio, hora_inicio, data_fim, hora_fim, cuidadora_id, req.params.id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Agendamento nao encontrado' });
  }

  res.json({ id: req.params.id, data_inicio, hora_inicio, data_fim, hora_fim, cuidadora_id });
}));

app.delete('/api/schedules/batch', asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Lista de IDs invalida' });
  }

  await db.query('DELETE FROM agendamentos WHERE id = ANY($1::text[])', [ids]);
  res.status(204).send();
}));

app.delete('/api/schedules/:id', asyncHandler(async (req, res) => {
  const result = await db.query('DELETE FROM agendamentos WHERE id = $1', [req.params.id]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Agendamento nao encontrado' });
  }

  res.status(204).send();
}));

app.get('/api/holidays', asyncHandler(async (_req, res) => {
  const result = await db.query('SELECT * FROM feriados ORDER BY data ASC');
  res.json(result.rows);
}));

app.post('/api/holidays', asyncHandler(async (req, res) => {
  const { data, nome } = req.body;
  if (!data || !nome) {
    return res.status(400).json({ error: 'Data e nome sao obrigatorios' });
  }

  const id = uuidv4();
  await db.query('INSERT INTO feriados (id, data, nome) VALUES ($1, $2, $3)', [id, data, nome]);
  res.status(201).json({ id, data, nome });
}));

app.delete('/api/holidays/:id', asyncHandler(async (req, res) => {
  await db.query('DELETE FROM feriados WHERE id = $1', [req.params.id]);
  res.json({ message: 'Apagado com sucesso' });
}));

app.post('/api/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const result = await db.query(
    `
      SELECT id, username, role, residencia_ids, cuidadora_ids
      FROM usuarios
      WHERE username = $1 AND password = $2
      LIMIT 1
    `,
    [username, password]
  );

  const user = result.rows[0];
  if (!user) {
    return res.status(401).json({ error: 'Credenciais invalidas' });
  }

  res.json({
    ...user,
    residencia_ids: parseJsonArray(user.residencia_ids),
    cuidadora_ids: parseJsonArray(user.cuidadora_ids),
  });
}));

app.get('/api/users', asyncHandler(async (_req, res) => {
  const result = await db.query(
    'SELECT id, username, role, residencia_ids, cuidadora_ids FROM usuarios ORDER BY username ASC'
  );

  res.json(
    result.rows.map((user) => ({
      ...user,
      residencia_ids: parseJsonArray(user.residencia_ids),
      cuidadora_ids: parseJsonArray(user.cuidadora_ids),
    }))
  );
}));

app.post('/api/users', asyncHandler(async (req, res) => {
  const { username, password, role, residencia_ids, cuidadora_ids } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Faltam dados' });
  }

  const id = uuidv4();
  await db.query(
    `
      INSERT INTO usuarios (id, username, password, role, residencia_ids, cuidadora_ids)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [id, username, password, role, JSON.stringify(residencia_ids || []), JSON.stringify(cuidadora_ids || [])]
  );

  res.status(201).json({ id, username, role, residencia_ids, cuidadora_ids });
}));

app.put('/api/users/:id', asyncHandler(async (req, res) => {
  const { username, password, role, residencia_ids, cuidadora_ids } = req.body;
  const residenciaIdsJson = JSON.stringify(residencia_ids || []);
  const cuidadoraIdsJson = JSON.stringify(cuidadora_ids || []);

  if (password) {
    await db.query(
      `
        UPDATE usuarios
        SET username = $1, password = $2, role = $3, residencia_ids = $4, cuidadora_ids = $5
        WHERE id = $6
      `,
      [username, password, role, residenciaIdsJson, cuidadoraIdsJson, req.params.id]
    );
  } else {
    await db.query(
      `
        UPDATE usuarios
        SET username = $1, role = $2, residencia_ids = $3, cuidadora_ids = $4
        WHERE id = $5
      `,
      [username, role, residenciaIdsJson, cuidadoraIdsJson, req.params.id]
    );
  }

  res.json({ message: 'Atualizado com sucesso' });
}));

app.delete('/api/users/:id', asyncHandler(async (req, res) => {
  await db.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
  res.json({ message: 'Apagado' });
}));

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  db.ready
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
      });
    })
    .catch((error) => {
      console.error('Falha ao inicializar o banco:', error);
      process.exit(1);
    });
}

module.exports = app;
