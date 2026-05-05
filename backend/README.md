# HotShot Backend

This folder contains the HotShot API. It uses Node.js with PostgreSQL, and the frontend can connect to it through `REACT_APP_API_URL`.

## Database

Create a local PostgreSQL database named `hotshot`:

```bash
createdb hotshot
```

The backend automatically creates the tables and loads the starter sports slate when it starts. The SQL structure is also documented in:

```text
backend/schema.sql
```

## Environment

Create a `.env` file or export these values in Terminal:

```bash
export DATABASE_URL=postgres://localhost:5432/hotshot
export HOST=127.0.0.1
export PORT=4000
export ODDS_API_KEY=
```

For hosted Postgres providers, set `DATABASE_URL` to the provider connection string. If the provider requires SSL, also set:

```bash
export PGSSL=true
```

If `ODDS_API_KEY` is set, the backend can sync live/recently completed NBA, NHL, and MLB scores from The Odds API. Completed games are only available from the last 3 days through that API.

## Run

```bash
cd backend
npm install
npm start
```

Default API URL:

```text
http://127.0.0.1:4000
```

## Frontend Connection

In the React app, set:

```bash
export REACT_APP_API_URL=http://127.0.0.1:4000/api
```

Then run the frontend normally from the project root:

```bash
npm start
```

## Endpoints

```text
GET  /api/health
POST /api/register
POST /api/login
GET  /api/me
GET  /api/games
GET  /api/games?sport=nba
GET  /api/games?sport=nhl
GET  /api/games?sport=mlb
GET  /api/bets
POST /api/bets
POST /api/parlays
GET  /api/leaderboard
GET  /api/sync-scores
POST /api/sync-scores
```

Authenticated routes use:

```text
Authorization: Bearer YOUR_TOKEN
```

## Example Requests

Create an account:

```bash
curl -X POST http://127.0.0.1:4000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"yourname","password":"password123"}'
```

Get games:

```bash
curl http://127.0.0.1:4000/api/games
```

Place a bet:

```bash
curl -X POST http://127.0.0.1:4000/api/bets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"gameId":"nba-hou-lal-g5","team":"Los Angeles Lakers","wager":50}'
```
