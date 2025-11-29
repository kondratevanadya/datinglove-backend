import express from 'express';
import pkg from 'pg';
import cors from 'cors';
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Эндпоинт для сохранения ника
app.post('/saveProfile', async (req, res) => {
  const { tg_id, nickname, age, avatar_url } = req.body;
  try {
    await pool.query(`
      INSERT INTO users(tg_id, nickname, age, avatar_url)
      VALUES($1, $2, $3, $4)
      ON CONFLICT (tg_id) DO UPDATE
      SET nickname=$2, age=$3, avatar_url=$4
    `, [tg_id, nickname, age, avatar_url]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка сохранения профиля' });
  }
});

// Получение профиля
app.get('/profile/:tg_id', async (req, res) => {
  const { tg_id } = req.params;
  try {
    const result = await pool.query(`
      SELECT nickname, age, avatar_url FROM users WHERE tg_id=$1
    `, [tg_id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(result.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка получения профиля' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
