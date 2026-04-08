const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
  db.all("PRAGMA table_info(cuidadoras)", (err, columns) => {
    const colNames = columns.map(c => c.name);
    if (!colNames.includes('dias_disponiveis')) {
      // Create column and fill existing rows with all days [0,1,2,3,4,5,6]
      db.run("ALTER TABLE cuidadoras ADD COLUMN dias_disponiveis TEXT DEFAULT '[0,1,2,3,4,5,6]'");
      console.log("Added dias_disponiveis to cuidadoras");
    }
  });
});
