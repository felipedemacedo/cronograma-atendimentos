const sqlite3 = require('sqlite3').verbose();
const dbName = process.env.NODE_ENV === 'test' ? './test.sqlite' : './database.sqlite';
const db = new sqlite3.Database(dbName);

db.serialize(() => {
  db.all("PRAGMA table_info(cuidadoras)", (err, columns) => {
    const colNames = columns.map(c => c.name);
    if (!colNames.includes('regime_clt')) {
      db.run("ALTER TABLE cuidadoras ADD COLUMN regime_clt INTEGER DEFAULT 0");
      console.log("Added regime_clt flag to cuidadoras");
    }
  });
});
