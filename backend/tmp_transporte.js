const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
  db.all("PRAGMA table_info(cuidadora_residencia)", (err, columns) => {
    const colNames = columns.map(c => c.name);
    if (!colNames.includes('valor_transporte')) {
      db.run("ALTER TABLE cuidadora_residencia ADD COLUMN valor_transporte REAL DEFAULT 9");
      console.log("Added valor_transporte to cuidadora_residencia");
    } else {
      console.log("valor_transporte already exists.");
    }
  });
});
