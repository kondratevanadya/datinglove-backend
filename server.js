'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const DB = require('./db');

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const BASE_URL = process.env.BASE_URL || '';
const UPLOAD_FOLDER = process.env.UPLOAD_FOLDER || './uploads';
const PORT = process.env.PORT || 3000;

if (!fs.existsSync(UPLOAD_FOLDER)){
  fs.mkdirSync(UPLOAD_FOLDER, { recursive: true });
}

const upload = multer({ dest: UPLOAD_FOLDER });

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// serve uploaded images
app.use('/images', express.static(path.resolve(UPLOAD_FOLDER)));

// --- API endpoints ---
// register
app.post('/api/register', upload.array('photos', 5), async (req, res) => {
  try {
    const { tg_id, username, name, age, city, about } = req.body;
    if (!tg_id || !name) return res.status(400).json({ ok: false, error: 'tg_id and name required' });
    // create user
    DB.createOrUpdateUser(tg_id, username);
    DB.updateProfile(tg_id, { name, age: parseInt(age)||null, city, about });
    // save photos
    if (req.files && req.files.length) {
      for (const f of req.files) {
        DB.addPhoto(tg_id, path.resolve(f.path));
      }
    }
    DB.markRegistered(tg_id);
    return res.json({ ok: true });
  } catch(err){
    console.error(err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// get profile
app.get('/api/profile/:tg_id', (req, res) => {
  const p = DB.getProfile(req.params.tg_id);
  if (!p) return res.status(404).json({ ok: false, error: 'Not found' });
  p.photo_urls = p.photos.map(x => (BASE_URL ? BASE_URL + '/images/' + path.basename(x) : '/images/' + path.basename(x)));
  return res.json(p);
});

// next profile
app.get('/api/next', (req, res) => {
  const user = req.query.tg_id;
  if (!user) return res.status(400).json({ ok: false, error: 'tg_id required' });
  const p = DB.nextProfileFor(user);
  if (!p) return res.json({ ok: false, message: 'no_more' });
  p.photo_urls = p.photos.map(x => (BASE_URL ? BASE_URL + '/images/' + path.basename(x) : '/images/' + path.basename(x)));
  return res.json({ ok: true, profile: p });
});

// like
app.post('/api/like', express.urlencoded({ extended: true }), (req, res) => {
  const from_id = req.body.from_id;
  const to_id = req.body.to_id;
  if (!from_id || !to_id) return res.status(400).json({ ok: false, error: 'from_id and to_id required' });
  const mutual = DB.recordLike(from_id, to_id);
  if (mutual) {
    try {
      const p_from = DB.getProfile(from_id);
      const p_to = DB.getProfile(to_id);
      const msg1 = `У вас совпадение! 💛\n\n${p_to.name||''}, ${p_to.age||''}, ${p_to.city||''}\n${p_to.about||''}\n`;
      const msg2 = `У вас совпадение! 💛\n\n${p_from.name||''}, ${p_from.age||''}, ${p_from.city||''}\n${p_from.about||''}\n`;
      if (BOT_TOKEN) {
        const fetch = require('node-fetch');
        fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: from_id, text: msg1 })
        }).catch(()=>{});
        fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: to_id, text: msg2 })
        }).catch(()=>{});
      }
    } catch(e){ console.error(e); }
  }
  return res.json({ ok: true, mutual });
});

// skip
app.post('/api/skip', express.urlencoded({ extended: true }), (req, res) => {
  const user_id = req.body.user_id;
  const skipped_id = req.body.skipped_id;
  if (!user_id || !skipped_id) return res.status(400).json({ ok: false });
  DB.recordView(user_id, skipped_id);
  return res.json({ ok: true });
});

app.get('/health', (req,res)=>res.json({ok:true}));

app.listen(PORT, () => {
  console.log('Server listening on', PORT);
});
