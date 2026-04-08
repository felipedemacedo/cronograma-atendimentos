const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
  db.all("PRAGMA table_info(cuidadoras)", (err, columns) => {
    const colNames = columns.map(c => c.name);
    if (!colNames.includes('adicional_noturno')) {
      db.run("ALTER TABLE cuidadoras ADD COLUMN adicional_noturno INTEGER DEFAULT NULL");
      console.log("Added adicional_noturno null constraint");
    }
    if (!colNames.includes('percentual_noturno')) {
      db.run("ALTER TABLE cuidadoras ADD COLUMN percentual_noturno REAL DEFAULT NULL");
      console.log("Added percentual_noturno null constraint");
    }
  });
});
