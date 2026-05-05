# HotShot Public Hosting Setup

HotShot needs three hosted pieces for the public demo:

1. React frontend
2. Node backend API
3. PostgreSQL database

The frontend alone cannot use `127.0.0.1:4000` after deployment because that address only works on your laptop.

## Backend

Deploy the `backend` folder as a Node web service.

Required environment variables:

```bash
DATABASE_URL=your_hosted_postgres_connection_string
HOST=0.0.0.0
PORT=4000
PGSSL=true
ODDS_API_KEY=your_the_odds_api_key
```

If your host automatically provides `PORT`, use its value and do not hardcode `4000`.

Backend start command:

```bash
npm start
```

Backend health check:

```text
https://your-backend-url/api/health
```

The health response should show:

```json
{
  "ok": true,
  "database": "connected",
  "realScoreSync": {
    "configured": true
  }
}
```

## Frontend

Set this environment variable on the frontend hosting site before building:

```bash
REACT_APP_API_URL=https://your-backend-url/api
```

Frontend build command:

```bash
npm run build
```

Publish directory:

```text
build
```

## What To Say

The public app uses a hosted React frontend. Accounts, points, bets, parlays, games, and leaderboards go through a hosted Node backend connected to PostgreSQL. The backend stores the API key as an environment variable and can sync recent real scores from The Odds API.
