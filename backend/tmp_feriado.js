const sqlite3 = require('sqlite3').verbose();
const dbName = process.env.NODE_ENV === 'test' ? './test.sqlite' : './database.sqlite';
const db = new sqlite3.Database(dbName);

db.serialize(() => {
  // Residências
  db.all("PRAGMA table_info(residencias)", (err, columns) => {
    const colNames = columns.map(c => c.name);
    if (!colNames.includes('adicional_feriado')) {
      db.run("ALTER TABLE residencias ADD COLUMN adicional_feriado INTEGER DEFAULT 0");
      db.run("ALTER TABLE residencias ADD COLUMN percentual_feriado REAL DEFAULT NULL");
      console.log("Added adicional_feriado to residencias");
    }
  });

  // Cuidadoras
  db.all("PRAGMA table_info(cuidadoras)", (err, columns) => {
    const colNames = columns.map(c => c.name);
    if (!colNames.includes('adicional_feriado')) {
      db.run("ALTER TABLE cuidadoras ADD COLUMN adicional_feriado INTEGER DEFAULT NULL");
      db.run("ALTER TABLE cuidadoras ADD COLUMN percentual_feriado REAL DEFAULT NULL");
      console.log("Added adicional_feriado to cuidadoras");
    }
  });
});
