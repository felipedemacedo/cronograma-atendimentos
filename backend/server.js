const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const db = require('./database');

const uuidv4 = () => crypto.randomUUID();

const app = express();
app.use(cors());
app.use(express.json());

// Listar todas as residências
app.get('/api/residences', (req, res) => {
  db.all('SELECT * FROM residencias', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Criar nova residência
app.post('/api/residences', (req, res) => {
  const { nome, endereco, valor_hora, adicional_noturno, percentual_noturno, adicional_feriado, percentual_feriado } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
  const id = uuidv4();
  const vHora = valor_hora !== undefined && valor_hora !== '' ? valor_hora : 10;
  const aNoturno = adicional_noturno ? 1 : 0;
  const pNoturno = percentual_noturno !== undefined && percentual_noturno !== '' ? parseFloat(percentual_noturno) : 20;
  const aFeriado = adicional_feriado ? 1 : 0;
  const pFeriado = percentual_feriado !== undefined && percentual_feriado !== '' ? parseFloat(percentual_feriado) : 20;

  db.run(
    'INSERT INTO residencias (id, nome, endereco, valor_hora, adicional_noturno, percentual_noturno, adicional_feriado, percentual_feriado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, nome, endereco || '', vHora, aNoturno, pNoturno, aFeriado, pFeriado],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id, nome, endereco, valor_hora: vHora, adicional_noturno: aNoturno, percentual_noturno: pNoturno, adicional_feriado: aFeriado, percentual_feriado: pFeriado });
    }
  );
});

// Atualizar residência
app.put('/api/residences/:id', (req, res) => {
  const { id } = req.params;
  const { nome, endereco, valor_hora, adicional_noturno, percentual_noturno, adicional_feriado, percentual_feriado } = req.body;
  const vHora = valor_hora !== undefined && valor_hora !== '' ? valor_hora : 10;
  const aNoturno = adicional_noturno ? 1 : 0;
  const pNoturno = percentual_noturno !== undefined && percentual_noturno !== '' ? parseFloat(percentual_noturno) : 20;
  const aFeriado = adicional_feriado ? 1 : 0;
  const pFeriado = percentual_feriado !== undefined && percentual_feriado !== '' ? parseFloat(percentual_feriado) : 20;

  db.run(
    'UPDATE residencias SET nome = ?, endereco = ?, valor_hora = ?, adicional_noturno = ?, percentual_noturno = ?, adicional_feriado = ?, percentual_feriado = ? WHERE id = ?',
    [nome, endereco || '', vHora, aNoturno, pNoturno, aFeriado, pFeriado, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Residência não encontrada' });
      res.json({ id, nome, endereco, valor_hora: vHora, adicional_noturno: aNoturno, percentual_noturno: pNoturno, adicional_feriado: aFeriado, percentual_feriado: pFeriado });
    }
  );
});

// Deletar residência
app.delete('/api/residences/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM residencias WHERE id = ?', id, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Residência não encontrada' });
    }
    // Deletar associações em cascata não automáticas no sqlite por padrão sem PRAGMA foreign_keys = ON, mas o CASCADE cuida disso se ativado.
    // Vamos deletar manualmente por segurança:
    db.run('DELETE FROM cuidadora_residencia WHERE residencia_id = ?', id);
    res.status(204).send();
  });
});

// --- CUIDADORAS ---

// Listar cuidadoras com suas residências
app.get('/api/caregivers', (req, res) => {
  db.all('SELECT * FROM cuidadoras', [], (err, cuidadoras) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.all('SELECT * FROM cuidadora_residencia', [], (err, rels) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const cuidadorasComResidencias = cuidadoras.map(c => {
        const suasResidencias = rels.filter(r => r.cuidadora_id === c.id);
        let parsedDias = [0,1,2,3,4,5,6];
        try { parsedDias = c.dias_disponiveis ? JSON.parse(c.dias_disponiveis) : [0,1,2,3,4,5,6]; } catch (e) {}
        return { 
          ...c, 
          dias_disponiveis: parsedDias,
          residencia_ids: suasResidencias.map(r => r.residencia_id),
          residencias_config: suasResidencias.map(r => ({ id: r.residencia_id, valor_transporte: r.valor_transporte }))
        };
      });
      res.json(cuidadorasComResidencias);
    });
  });
});

// Criar cuidadora
app.post('/api/caregivers', (req, res) => {
  const { nome, residencia_ids, residencias_config, valor_hora, observacao, dias_disponiveis, adicional_noturno, percentual_noturno, regime_clt, adicional_feriado, percentual_feriado } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
  
  const id = uuidv4();
  const vHora = valor_hora !== undefined && valor_hora !== '' ? valor_hora : null;
  const diasStr = dias_disponiveis ? JSON.stringify(dias_disponiveis) : '[0,1,2,3,4,5,6]';
  const aNoturno = adicional_noturno !== undefined && adicional_noturno !== '' ? parseInt(adicional_noturno) : null;
  const pNoturno = percentual_noturno !== undefined && percentual_noturno !== '' ? parseFloat(percentual_noturno) : null;
  const aFeriado = adicional_feriado !== undefined && adicional_feriado !== '' ? parseInt(adicional_feriado) : null;
  const pFeriado = percentual_feriado !== undefined && percentual_feriado !== '' ? parseFloat(percentual_feriado) : null;
  const isClt = regime_clt ? 1 : 0;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    try {
      db.run('INSERT INTO cuidadoras (id, nome, valor_hora, observacao, dias_disponiveis, adicional_noturno, percentual_noturno, regime_clt, adicional_feriado, percentual_feriado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, nome, vHora, observacao || '', diasStr, aNoturno, pNoturno, isClt, aFeriado, pFeriado]);
      
      const configs = residencias_config || (residencia_ids || []).map(rId => ({ id: rId, valor_transporte: 9 }));
      if (configs.length > 0) {
        const stmt = db.prepare('INSERT INTO cuidadora_residencia (cuidadora_id, residencia_id, valor_transporte) VALUES (?, ?, ?)');
        configs.forEach(r => stmt.run(id, r.id, r.valor_transporte !== undefined && r.valor_transporte !== '' ? r.valor_transporte : 9));
        stmt.finalize();
      }
      db.run('COMMIT');
      res.status(201).json({ id, nome, valor_hora: vHora, observacao, dias_disponiveis, regime_clt: isClt === 1, residencia_ids: configs.map(c => c.id), residencias_config: configs });
    } catch (error) {
      db.run('ROLLBACK');
      res.status(500).json({ error: error.message });
    }
  });
});

// Atualizar cuidadora
app.put('/api/caregivers/:id', (req, res) => {
  const { id } = req.params;
  const { nome, residencia_ids, residencias_config, valor_hora, observacao, dias_disponiveis, adicional_noturno, percentual_noturno, regime_clt, adicional_feriado, percentual_feriado } = req.body;
  const vHora = valor_hora !== undefined && valor_hora !== '' ? valor_hora : null;
  const diasStr = dias_disponiveis ? JSON.stringify(dias_disponiveis) : '[0,1,2,3,4,5,6]';
  const aNoturno = adicional_noturno !== undefined && adicional_noturno !== '' ? parseInt(adicional_noturno) : null;
  const pNoturno = percentual_noturno !== undefined && percentual_noturno !== '' ? parseFloat(percentual_noturno) : null;
  const aFeriado = adicional_feriado !== undefined && adicional_feriado !== '' ? parseInt(adicional_feriado) : null;
  const pFeriado = percentual_feriado !== undefined && percentual_feriado !== '' ? parseFloat(percentual_feriado) : null;
  const isClt = regime_clt ? 1 : 0;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    try {
      db.run('UPDATE cuidadoras SET nome = ?, valor_hora = ?, observacao = ?, dias_disponiveis = ?, adicional_noturno = ?, percentual_noturno = ?, regime_clt = ?, adicional_feriado = ?, percentual_feriado = ? WHERE id = ?', [nome, vHora, observacao || '', diasStr, aNoturno, pNoturno, isClt, aFeriado, pFeriado, id]);
      db.run('DELETE FROM cuidadora_residencia WHERE cuidadora_id = ?', id);
      
      const configs = residencias_config || (residencia_ids || []).map(rId => ({ id: rId, valor_transporte: 9 }));
      if (configs.length > 0) {
        const stmt = db.prepare('INSERT INTO cuidadora_residencia (cuidadora_id, residencia_id, valor_transporte) VALUES (?, ?, ?)');
        configs.forEach(r => stmt.run(id, r.id, r.valor_transporte !== undefined && r.valor_transporte !== '' ? r.valor_transporte : 9));
        stmt.finalize();
      }
      
      db.run('COMMIT');
      res.json({ id, nome, valor_hora: vHora, observacao, dias_disponiveis, regime_clt: isClt === 1, residencia_ids: configs.map(c => c.id), residencias_config: configs });
    } catch (error) {
      db.run('ROLLBACK');
      res.status(500).json({ error: error.message });
    }
  });
});

// Deletar cuidadora
app.delete('/api/caregivers/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM cuidadoras WHERE id = ?', id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Cuidadora não encontrada' });
    
    db.run('DELETE FROM cuidadora_residencia WHERE cuidadora_id = ?', id);
    res.status(204).send();
  });
});

// --- AGENDAMENTOS / CRONOGRAMA ---

// Listar todos os agendamentos
app.get('/api/schedules', (req, res) => {
  const query = `
    SELECT a.*, 
           r.nome as residencia_nome, 
           r.valor_hora as residencia_valor_hora,
           r.adicional_noturno as residencia_adicional_noturno,
           r.percentual_noturno as residencia_percentual_noturno,
           r.adicional_feriado as residencia_adicional_feriado,
           r.percentual_feriado as residencia_percentual_feriado,
           c.nome as cuidadora_nome,
           c.valor_hora as cuidadora_valor_hora,
           c.regime_clt as cuidadora_regime_clt,
           c.adicional_noturno as cuidadora_adicional_noturno,
           c.percentual_noturno as cuidadora_percentual_noturno,
           c.adicional_feriado as cuidadora_adicional_feriado,
           c.percentual_feriado as cuidadora_percentual_feriado,
           COALESCE(cr.valor_transporte, 9) as valor_transporte
    FROM agendamentos a
    JOIN residencias r ON a.residencia_id = r.id
    JOIN cuidadoras c ON a.cuidadora_id = c.id
    LEFT JOIN cuidadora_residencia cr ON a.cuidadora_id = cr.cuidadora_id AND a.residencia_id = cr.residencia_id
    ORDER BY a.data_inicio ASC, a.hora_inicio ASC
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Criar múltiplos agendamentos de uma vez (Batch - para lidar com lógicas de "dias ímpares", etc do frontend)
app.post('/api/schedules/batch', (req, res) => {
  const { schedules } = req.body;
  if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
    return res.status(400).json({ error: 'Lista de agendamentos inválida' });
  }

  const stmt = db.prepare(`
    INSERT INTO agendamentos (id, residencia_id, cuidadora_id, data_inicio, hora_inicio, data_fim, hora_fim) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    try {
      schedules.forEach(sched => {
        const id = uuidv4();
        stmt.run([id, sched.residencia_id, sched.cuidadora_id, sched.data_inicio, sched.hora_inicio, sched.data_fim, sched.hora_fim]);
      });
      db.run('COMMIT');
      stmt.finalize();
      res.status(201).json({ message: 'Agendamentos criados com sucesso' });
    } catch (error) {
      db.run('ROLLBACK');
      res.status(500).json({ error: error.message });
    }
  });
});

// Editar um agendamento específico
app.put('/api/schedules/:id', (req, res) => {
  const { id } = req.params;
  const { data_inicio, hora_inicio, data_fim, hora_fim, cuidadora_id } = req.body;

  db.run(`
    UPDATE agendamentos 
    SET data_inicio = ?, hora_inicio = ?, data_fim = ?, hora_fim = ?, cuidadora_id = ?
    WHERE id = ?`,
    [data_inicio, hora_inicio, data_fim, hora_fim, cuidadora_id, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });
      res.json({ id, data_inicio, hora_inicio, data_fim, hora_fim });
    }
  );
});

// Excluir múltiplos agendamentos de uma vez (Batch)
app.delete('/api/schedules/batch', (req, res) => {
  const { ids } = req.body; // ids no body do DELETE ou via query (mas DELETE body é melhor tratar se suportado, senao usar POST)
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Lista de IDs inválida' });
  }
  const placeholders = ids.map(() => '?').join(',');
  db.run(`DELETE FROM agendamentos WHERE id IN (${placeholders})`, ids, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(204).send();
  });
});

// Excluir um agendamento específico
app.delete('/api/schedules/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM agendamentos WHERE id = ?', id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });
    res.status(204).send();
  });
});

const PORT = 3000;

// --------------------------------------------------------------------
// HOlidays API
// --------------------------------------------------------------------
app.get('/api/holidays', (req, res) => {
  db.all('SELECT * FROM feriados ORDER BY data ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/holidays', (req, res) => {
  const { data, nome } = req.body;
  if (!data || !nome) return res.status(400).json({ error: 'Data e Nome são obrigatórios' });
  const id = uuidv4();
  db.run('INSERT INTO feriados (id, data, nome) VALUES (?, ?, ?)', [id, data, nome], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id, data, nome });
  });
});

app.delete('/api/holidays/:id', (req, res) => {
  db.run('DELETE FROM feriados WHERE id = ?', req.params.id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Apagado com sucesso' });
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

module.exports = app;
