const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');

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
  const { nome, endereco, valor_hora, adicional_noturno, percentual_noturno } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
  const id = uuidv4();
  const vHora = valor_hora !== undefined && valor_hora !== '' ? valor_hora : 10;
  const adNoturno = adicional_noturno ? 1 : 0;
  const pctNoturno = percentual_noturno !== undefined && percentual_noturno !== '' ? percentual_noturno : 20;

  db.run('INSERT INTO residencias (id, nome, endereco, valor_hora, adicional_noturno, percentual_noturno) VALUES (?, ?, ?, ?, ?, ?)',
    [id, nome, endereco, vHora, adNoturno, pctNoturno],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id, nome, endereco, valor_hora: vHora, adicional_noturno: adNoturno, percentual_noturno: pctNoturno });
    }
  );
});

// Atualizar residência
app.put('/api/residences/:id', (req, res) => {
  const { id } = req.params;
  const { nome, endereco, valor_hora, adicional_noturno, percentual_noturno } = req.body;
  const vHora = valor_hora !== undefined && valor_hora !== '' ? valor_hora : 10;
  const adNoturno = adicional_noturno ? 1 : 0;
  const pctNoturno = percentual_noturno !== undefined && percentual_noturno !== '' ? percentual_noturno : 20;

  db.run('UPDATE residencias SET nome = ?, endereco = ?, valor_hora = ?, adicional_noturno = ?, percentual_noturno = ? WHERE id = ?',
    [nome, endereco, vHora, adNoturno, pctNoturno, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Residência não encontrada' });
      res.json({ id, nome, endereco, valor_hora: vHora, adicional_noturno: adNoturno, percentual_noturno: pctNoturno });
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
  const { nome, residencia_ids, residencias_config, valor_hora, observacao, dias_disponiveis } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
  
  const id = uuidv4();
  const vHora = valor_hora !== undefined && valor_hora !== '' ? valor_hora : null;
  const diasStr = dias_disponiveis ? JSON.stringify(dias_disponiveis) : '[0,1,2,3,4,5,6]';

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    try {
      db.run('INSERT INTO cuidadoras (id, nome, valor_hora, observacao, dias_disponiveis) VALUES (?, ?, ?, ?, ?)', [id, nome, vHora, observacao || '', diasStr]);
      
      const configs = residencias_config || (residencia_ids || []).map(rId => ({ id: rId, valor_transporte: 9 }));
      if (configs.length > 0) {
        const stmt = db.prepare('INSERT INTO cuidadora_residencia (cuidadora_id, residencia_id, valor_transporte) VALUES (?, ?, ?)');
        configs.forEach(r => stmt.run(id, r.id, r.valor_transporte !== undefined && r.valor_transporte !== '' ? r.valor_transporte : 9));
        stmt.finalize();
      }
      db.run('COMMIT');
      res.status(201).json({ id, nome, valor_hora: vHora, observacao, dias_disponiveis, residencia_ids: configs.map(c => c.id), residencias_config: configs });
    } catch (error) {
      db.run('ROLLBACK');
      res.status(500).json({ error: error.message });
    }
  });
});

// Atualizar cuidadora
app.put('/api/caregivers/:id', (req, res) => {
  const { id } = req.params;
  const { nome, residencia_ids, residencias_config, valor_hora, observacao, dias_disponiveis } = req.body;
  const vHora = valor_hora !== undefined && valor_hora !== '' ? valor_hora : null;
  const diasStr = dias_disponiveis ? JSON.stringify(dias_disponiveis) : '[0,1,2,3,4,5,6]';

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    try {
      db.run('UPDATE cuidadoras SET nome = ?, valor_hora = ?, observacao = ?, dias_disponiveis = ? WHERE id = ?', [nome, vHora, observacao || '', diasStr, id]);
      db.run('DELETE FROM cuidadora_residencia WHERE cuidadora_id = ?', id);
      
      const configs = residencias_config || (residencia_ids || []).map(rId => ({ id: rId, valor_transporte: 9 }));
      if (configs.length > 0) {
        const stmt = db.prepare('INSERT INTO cuidadora_residencia (cuidadora_id, residencia_id, valor_transporte) VALUES (?, ?, ?)');
        configs.forEach(r => stmt.run(id, r.id, r.valor_transporte !== undefined && r.valor_transporte !== '' ? r.valor_transporte : 9));
        stmt.finalize();
      }
      
      db.run('COMMIT');
      res.json({ id, nome, valor_hora: vHora, observacao, dias_disponiveis, residencia_ids: configs.map(c => c.id), residencias_config: configs });
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
           c.nome as cuidadora_nome,
           c.valor_hora as cuidadora_valor_hora,
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
  const { data_inicio, hora_inicio, data_fim, hora_fim } = req.body;

  db.run(`
    UPDATE agendamentos 
    SET data_inicio = ?, hora_inicio = ?, data_fim = ?, hora_fim = ? 
    WHERE id = ?`,
    [data_inicio, hora_inicio, data_fim, hora_fim, id],
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
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
