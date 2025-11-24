# Dating Backend (MVP)

This project is a minimal backend for a Telegram Mini App (MVP).  
It provides simple API endpoints for:

- user registration (profiles)
- photo upload
- "next profile" browsing
- like / skip actions
- mutual-match Telegram notification via Bot API

It uses SQLite (better-sqlite3) for simplicity and stores uploaded photos in `uploads/`.

## Quick start (locally)

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and edit `BOT_TOKEN` and other values.

3. Run:
```bash
npm run dev   # requires nodemon globally, or use `npm start`
```

The server listens on port defined in `.env` (default 3000).

## Deploying to Railway

1. Push the repository to GitHub.
2. In Railway, create **New Project → Deploy from GitHub** and select this repository.
3. Set environment variables in Railway (BOT_TOKEN, DATABASE_FILE, UPLOAD_FOLDER, BASE_URL if needed).
4. Deploy — Railway will give you a public URL (e.g. https://your-backend.up.railway.app).
5. Use that URL in your Mini App frontend to call the API.

## API (MVP)

- `POST /api/register` (form-data): tg_id, username, name, age, city, about, photos (files)
- `GET /api/profile/:tg_id` - get profile by tg_id
- `GET /api/next?tg_id=...` - get next profile to view
- `POST /api/like` form-encoded: from_id, to_id
- `POST /api/skip` form-encoded: user_id, skipped_id

See `server.js` for implementation details.

