const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
  db.all("PRAGMA table_info(cuidadoras)", (err, columns) => {
    const colNames = columns.map(c => c.name);
    if (!colNames.includes('observacao')) {
      db.run("ALTER TABLE cuidadoras ADD COLUMN observacao TEXT");
      console.log("Added observacao to cuidadoras");
    }
    if (!colNames.includes('dias_indisponiveis')) {
      db.run("ALTER TABLE cuidadoras ADD COLUMN dias_indisponiveis TEXT");
      console.log("Added dias_indisponiveis to cuidadoras");
    }
  });
});
