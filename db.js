const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_FILE = process.env.DATABASE_FILE || './data/database.sqlite';
const DB_DIR = path.dirname(DB_FILE);
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_FILE);

function init() {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      tg_id TEXT PRIMARY KEY,
      username TEXT,
      name TEXT,
      age INTEGER,
      city TEXT,
      about TEXT,
      registered INTEGER DEFAULT 0
    );
  `).run();
  db.prepare(`
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      file_path TEXT,
      ord INTEGER
    );
  `).run();
  db.prepare(`
    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_id TEXT,
      to_id TEXT,
      UNIQUE(from_id, to_id)
    );
  `).run();
  db.prepare(`
    CREATE TABLE IF NOT EXISTS views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      viewed_id TEXT,
      UNIQUE(user_id, viewed_id)
    );
  `).run();
}

init();

module.exports = {
  createOrUpdateUser: function(tg_id, username){
    const st = db.prepare('SELECT tg_id FROM users WHERE tg_id = ?');
    const r = st.get(tg_id);
    if (!r) db.prepare('INSERT INTO users(tg_id, username) VALUES(?,?)').run(tg_id, username || null);
    else if (username) db.prepare('UPDATE users SET username = ? WHERE tg_id = ?').run(username, tg_id);
  },
  updateProfile: function(tg_id, data){
    const cur = db.prepare('UPDATE users SET name = ?, age = ?, city = ?, about = ? WHERE tg_id = ?');
    cur.run(data.name || null, data.age || null, data.city || null, data.about || null, tg_id);
  },
  markRegistered: function(tg_id){
    db.prepare('UPDATE users SET registered = 1 WHERE tg_id = ?').run(tg_id);
  },
  addPhoto: function(tg_id, file_path){
    const ordRow = db.prepare('SELECT COALESCE(MAX(ord),0) as m FROM photos WHERE user_id = ?').get(tg_id);
    const ord = (ordRow && ordRow.m) ? ordRow.m + 1 : 1;
    db.prepare('INSERT INTO photos(user_id, file_path, ord) VALUES(?,?,?)').run(tg_id, file_path, ord);
  },
  getProfile: function(tg_id){
    const row = db.prepare('SELECT tg_id, username, name, age, city, about, registered FROM users WHERE tg_id = ?').get(tg_id);
    if (!row) return null;
    const photos = db.prepare('SELECT file_path FROM photos WHERE user_id = ? ORDER BY ord').all(tg_id).map(r=>r.file_path);
    return {
      tg_id: row.tg_id,
      username: row.username,
      name: row.name,
      age: row.age,
      city: row.city,
      about: row.about,
      registered: !!row.registered,
      photos
    };
  },
  nextProfileFor: function(user_id){
    const cand = db.prepare(`
      SELECT u.tg_id FROM users u 
      WHERE u.registered = 1 AND u.tg_id != ?
      AND u.tg_id NOT IN (SELECT viewed_id FROM views WHERE user_id = ?)
      LIMIT 1
    `).get(user_id, user_id);
    if (!cand) return null;
    const p = this.getProfile(cand.tg_id);
    db.prepare('INSERT OR IGNORE INTO views(user_id, viewed_id) VALUES(?,?)').run(user_id, cand.tg_id);
    return p;
  },
  recordLike: function(from_id, to_id){
    try {
      db.prepare('INSERT INTO likes(from_id,to_id) VALUES(?,?)').run(from_id, to_id);
    } catch(e){}
    const mutual = db.prepare('SELECT 1 FROM likes WHERE from_id = ? AND to_id = ?').get(to_id, from_id);
    return !!mutual;
  },
  recordView: function(user_id, viewed_id){
    db.prepare('INSERT OR IGNORE INTO views(user_id, viewed_id) VALUES(?,?)').run(user_id, viewed_id);
  }
};
