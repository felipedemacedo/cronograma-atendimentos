const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
  // Residencias
  db.all("PRAGMA table_info(residencias)", (err, columns) => {
    const colNames = columns.map(c => c.name);
    if (!colNames.includes('valor_hora')) {
      db.run("ALTER TABLE residencias ADD COLUMN valor_hora REAL DEFAULT 10");
      console.log("Added valor_hora to residencias");
    }
    if (!colNames.includes('adicional_noturno')) {
      db.run("ALTER TABLE residencias ADD COLUMN adicional_noturno INTEGER DEFAULT 0");
      console.log("Added adicional_noturno to residencias");
    }
    if (!colNames.includes('percentual_noturno')) {
      db.run("ALTER TABLE residencias ADD COLUMN percentual_noturno REAL DEFAULT 20");
      console.log("Added percentual_noturno to residencias");
    }
  });

  // Cuidadoras
  db.all("PRAGMA table_info(cuidadoras)", (err, columns) => {
    const colNames = columns.map(c => c.name);
    if (!colNames.includes('valor_hora')) {
      db.run("ALTER TABLE cuidadoras ADD COLUMN valor_hora REAL");
      console.log("Added valor_hora to cuidadoras");
    }
  });
});
