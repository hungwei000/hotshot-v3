# HotShot Permanent Hosting

This project is now set up as one full-stack Node app:

- `/` serves the React website from `build/`
- `/api/...` serves the backend
- PostgreSQL stores users, bets, parlays, history, and leaderboard data
- The Odds API key is read from `ODDS_API_KEY`

## Render Blueprint

1. Push this project folder to GitHub.
2. In Render, create a new Blueprint from the repository.
3. Render will read `render.yaml`.
4. When Render asks for `ODDS_API_KEY`, paste the API key.
5. Deploy.

Render uses these commands:

```bash
npm install && npm run build
npm start
```

The backend will create its database tables automatically on first startup.

## Manual Host Settings

If a host does not use `render.yaml`, use these settings:

```bash
Build command: npm install && npm run build
Start command: npm start
```

Environment variables:

```bash
HOST=0.0.0.0
DATABASE_URL=<your hosted PostgreSQL connection string>
PGSSL=true
ODDS_API_KEY=<your Odds API key>
NODE_ENV=production
```

Do not set `REACT_APP_API_URL` on the host. The production site uses `/api` automatically.
