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
  const { nome, endereco } = req.body;
  if (!nome) {
    return res.status(400).json({ error: 'O nome é obrigatório' });
  }
  const id = uuidv4();
  db.run(
    'INSERT INTO residencias (id, nome, endereco) VALUES (?, ?, ?)',
    [id, nome, endereco || null],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id, nome, endereco });
    }
  );
});

// Atualizar residência
app.put('/api/residences/:id', (req, res) => {
  const { id } = req.params;
  const { nome, endereco } = req.body;
  if (!nome) {
    return res.status(400).json({ error: 'O nome é obrigatório' });
  }

  db.run(
    'UPDATE residencias SET nome = ?, endereco = ? WHERE id = ?',
    [nome, endereco || null, id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Residência não encontrada' });
      }
      res.json({ id, nome, endereco });
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
        const suasResidencias = rels.filter(r => r.cuidadora_id === c.id).map(r => r.residencia_id);
        return { ...c, residencia_ids: suasResidencias };
      });
      res.json(cuidadorasComResidencias);
    });
  });
});

// Criar cuidadora
app.post('/api/caregivers', (req, res) => {
  const { nome, residencia_ids } = req.body; // residencia_ids é um array de IDs
  if (!nome) return res.status(400).json({ error: 'O nome é obrigatório' });
  
  const id = uuidv4();
  db.run('INSERT INTO cuidadoras (id, nome) VALUES (?, ?)', [id, nome], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    if (residencia_ids && residencia_ids.length > 0) {
      const stmt = db.prepare('INSERT INTO cuidadora_residencia (cuidadora_id, residencia_id) VALUES (?, ?)');
      residencia_ids.forEach(r_id => stmt.run([id, r_id]));
      stmt.finalize();
    }
    res.status(201).json({ id, nome, residencia_ids: residencia_ids || [] });
  });
});

// Atualizar cuidadora
app.put('/api/caregivers/:id', (req, res) => {
  const { id } = req.params;
  const { nome, residencia_ids } = req.body;
  if (!nome) return res.status(400).json({ error: 'O nome é obrigatório' });

  db.run('UPDATE cuidadoras SET nome = ? WHERE id = ?', [nome, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Cuidadora não encontrada' });
    
    // Atualiza as associações
    db.run('DELETE FROM cuidadora_residencia WHERE cuidadora_id = ?', id, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (residencia_ids && residencia_ids.length > 0) {
        const stmt = db.prepare('INSERT INTO cuidadora_residencia (cuidadora_id, residencia_id) VALUES (?, ?)');
        residencia_ids.forEach(r_id => stmt.run([id, r_id]));
        stmt.finalize();
      }
      res.json({ id, nome, residencia_ids: residencia_ids || [] });
    });
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
    SELECT a.*, r.nome as residencia_nome, c.nome as cuidadora_nome 
    FROM agendamentos a
    JOIN residencias r ON a.residencia_id = r.id
    JOIN cuidadoras c ON a.cuidadora_id = c.id
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
