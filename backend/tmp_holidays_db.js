const sqlite3 = require('sqlite3').verbose();
const dbName = process.env.NODE_ENV === 'test' ? './test.sqlite' : './database.sqlite';
const db = new sqlite3.Database(dbName);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS feriados (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      nome TEXT NOT NULL
    )
  `, (err) => {
    if (err) console.error("Error creating feriados table", err);
    else console.log("Added feriados table");
  });
});
