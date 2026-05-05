CREATE TABLE IF NOT EXISTS sports (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  sport_id TEXT NOT NULL REFERENCES sports(id),
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  code TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  sport_id TEXT NOT NULL REFERENCES sports(id),
  home_team_id TEXT NOT NULL REFERENCES teams(id),
  away_team_id TEXT NOT NULL REFERENCES teams(id),
  starts_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('upcoming', 'live', 'final')),
  home_odds INTEGER NOT NULL,
  away_odds INTEGER NOT NULL,
  ou NUMERIC(5,1),
  storyline TEXT,
  outcome_team_id TEXT REFERENCES teams(id),
  home_score INTEGER,
  away_score INTEGER,
  clock TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 1000,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL REFERENCES games(id),
  selected_team_id TEXT NOT NULL REFERENCES teams(id),
  odds INTEGER NOT NULL,
  wager INTEGER NOT NULL,
  potential_win INTEGER NOT NULL,
  result TEXT CHECK (result IN ('win', 'loss')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS parlays (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wager INTEGER NOT NULL,
  potential_win INTEGER NOT NULL DEFAULT 0,
  result TEXT CHECK (result IN ('win', 'loss')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS parlay_legs (
  id TEXT PRIMARY KEY,
  parlay_id TEXT NOT NULL REFERENCES parlays(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL REFERENCES games(id),
  selected_team_id TEXT NOT NULL REFERENCES teams(id),
  odds INTEGER NOT NULL,
  result TEXT CHECK (result IN ('win', 'loss'))
);
