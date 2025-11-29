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
app.post('/saveNickname', async (req, res) => {
  const { telegram_id, nickname } = req.body;
  try {
    await pool.query(
      `INSERT INTO users(tg_id, nickname) VALUES($1,$2)
       ON CONFLICT (tg_id) DO UPDATE SET nickname=$2`,
      [telegram_id, nickname]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка сохранения' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
