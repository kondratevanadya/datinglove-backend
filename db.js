import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Вспомогательная функция для запросов
async function query(text, params) {
  const res = await pool.query(text, params);
  return res;
}

export default {
  // Создать или обновить пользователя
  createOrUpdateUser: async (tg_id, username) => {
    const res = await query('SELECT tg_id FROM users WHERE tg_id=$1', [tg_id]);
    if (res.rowCount === 0) {
      await query('INSERT INTO users(tg_id, username) VALUES($1,$2)', [tg_id, username || null]);
    } else if (username) {
      await query('UPDATE users SET username=$1 WHERE tg_id=$2', [username, tg_id]);
    }
  },

  // Обновить профиль
  updateProfile: async (tg_id, data) => {
    await query(
      'UPDATE users SET name=$1, age=$2, city=$3, about=$4 WHERE tg_id=$5',
      [data.name || null, data.age || null, data.city || null, data.about || null, tg_id]
    );
  },

  // Отметить пользователя как зарегистрированного
  markRegistered: async (tg_id) => {
    await query('UPDATE users SET registered=1 WHERE tg_id=$1', [tg_id]);
  },

  // Добавить фото пользователя
  addPhoto: async (tg_id, file_path) => {
    const res = await query('SELECT COALESCE(MAX(ord),0) as m FROM photos WHERE user_id=$1', [tg_id]);
    const ord = res.rows[0].m + 1;
    await query('INSERT INTO photos(user_id,file_path,ord) VALUES($1,$2,$3)', [tg_id, file_path, ord]);
  },

  // Получить профиль пользователя
  getProfile: async (tg_id) => {
    const res = await query('SELECT * FROM users WHERE tg_id=$1', [tg_id]);
    const row = res.rows[0];
    if (!row) return null;

    const photosRes = await query('SELECT file_path FROM photos WHERE user_id=$1 ORDER BY ord', [tg_id]);
    const photos = photosRes.rows.map(r => r.file_path);

    return { ...row, registered: !!row.registered, photos };
  },

  // Получить следующего пользователя для показа (для swipe)
  nextProfileFor: async (user_id) => {
    const res = await query(`
      SELECT u.tg_id FROM users u
      WHERE u.registered = 1 AND u.tg_id != $1
      AND u.tg_id NOT IN (SELECT viewed_id FROM views WHERE user_id=$1)
      LIMIT 1
    `, [user_id]);

    if (res.rowCount === 0) return null;

    const profile = await this.getProfile(res.rows[0].tg_id);
    await query('INSERT INTO views(user_id,viewed_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [user_id, res.rows[0].tg_id]);
    return profile;
  },

  // Записать лайк и проверить взаимный лайк
  recordLike: async (from_id, to_id) => {
    try {
      await query('INSERT INTO likes(from_id,to_id) VALUES($1,$2)', [from_id, to_id]);
    } catch(e) {} // уникальный ключ может вызвать ошибку, игнорируем
    const mutual = await query('SELECT 1 FROM likes WHERE from_id=$1 AND to_id=$2', [to_id, from_id]);
    return mutual.rowCount > 0;
  },

  // Записать просмотр профиля
  recordView: async (user_id, viewed_id) => {
    await query('INSERT INTO views(user_id,viewed_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [user_id, viewed_id]);
  }
};
