const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao abrir o banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS residencias (
          id TEXT PRIMARY KEY,
          nome TEXT NOT NULL,
          endereco TEXT
        )
      `);
      
      db.run(`
        CREATE TABLE IF NOT EXISTS cuidadoras (
          id TEXT PRIMARY KEY,
          nome TEXT NOT NULL
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS cuidadora_residencia (
          cuidadora_id TEXT,
          residencia_id TEXT,
          PRIMARY KEY (cuidadora_id, residencia_id),
          FOREIGN KEY (cuidadora_id) REFERENCES cuidadoras(id) ON DELETE CASCADE,
          FOREIGN KEY (residencia_id) REFERENCES residencias(id) ON DELETE CASCADE
        )
      `);
    });
  }
});

module.exports = db;
