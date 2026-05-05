# Move Local HotShot Data To Public Hosting

The public frontend must point to a public backend URL. The backend must point to a hosted PostgreSQL database.

## Files

- `deploy/hotshot-schema.sql`: database structure
- `deploy/hotshot-local-data.sql`: current local accounts, games, bets, parlays, and leaderboard data

## Import Local Data Into Hosted Postgres

Replace `YOUR_PUBLIC_DATABASE_URL` with the hosted PostgreSQL connection string:

```bash
psql "YOUR_PUBLIC_DATABASE_URL" < deploy/hotshot-schema.sql
psql "YOUR_PUBLIC_DATABASE_URL" < deploy/hotshot-local-data.sql
```

If the hosted database already has tables and you only need the current data, import the data file only.

## Public Backend Environment Variables

Set these on the backend host:

```bash
DATABASE_URL="YOUR_PUBLIC_DATABASE_URL"
HOST=0.0.0.0
PORT=4000
ODDS_API_KEY="YOUR_ODDS_API_KEY"
```

Then run:

```bash
cd backend
npm install
npm start
```

Test:

```bash
curl https://YOUR_BACKEND_URL/api/health
```

## Public Frontend Build

Replace `YOUR_BACKEND_URL` with the public backend URL:

```bash
REACT_APP_API_URL=https://YOUR_BACKEND_URL/api npm run build
zip -qr hotshot-build.zip build
```

Upload the new `build` folder or `hotshot-build.zip` to the frontend host.
