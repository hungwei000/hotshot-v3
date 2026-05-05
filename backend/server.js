const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || "127.0.0.1";
const DATABASE_URL = process.env.DATABASE_URL || "postgres://localhost:5432/hotshot";
const FRONTEND_BUILD_DIR = process.env.FRONTEND_BUILD_DIR || path.resolve(__dirname, "..", "build");
const ODDS_API_KEY = process.env.ODDS_API_KEY || "";
const ODDS_API_BASE_URL = process.env.ODDS_API_BASE_URL || "https://api.the-odds-api.com";
const SCORE_SYNC_INTERVAL_MS = Number(process.env.SCORE_SYNC_INTERVAL_MS || 10 * 60 * 1000);
const ODDS_SYNC_INTERVAL_MS = Number(process.env.ODDS_SYNC_INTERVAL_MS || 10 * 60 * 1000);

const ODDS_API_SPORT_KEYS = {
  nba: "basketball_nba",
  nhl: "icehockey_nhl",
  mlb: "baseball_mlb",
};

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false,
});

let dbReady = false;
let dbError = null;
let lastScoreSyncAt = 0;
let lastScoreSyncResult = { skipped: true, reason: "No sync has run yet." };
let lastOddsSyncAt = 0;
let lastOddsSyncResult = { skipped: true, reason: "No odds sync has run yet." };

function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function makeId(prefix) {
  return `${prefix}-${crypto.randomBytes(8).toString("hex")}`;
}

function payout(wager, odds) {
  return odds > 0 ? Math.round(wager * (odds / 100)) : Math.round(wager * (100 / Math.abs(odds)));
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sameGameDate(left, right) {
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();
  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) return false;
  return Math.abs(leftTime - rightTime) <= 36 * 60 * 60 * 1000;
}

function scoreForTeam(event, teamName) {
  const normalizedTeam = normalizeName(teamName);
  const score = (event.scores || []).find((item) => normalizeName(item.name) === normalizedTeam);
  return score ? Number(score.score) : null;
}

function oddsForTeam(event, teamName) {
  const normalizedTeam = normalizeName(teamName);
  for (const bookmaker of event.bookmakers || []) {
    const h2hMarket = (bookmaker.markets || []).find((market) => market.key === "h2h");
    const outcome = h2hMarket?.outcomes?.find((item) => normalizeName(item.name) === normalizedTeam);
    if (outcome && Number.isFinite(Number(outcome.price))) {
      return Number(outcome.price);
    }
  }
  return null;
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Content-Type": "application/json",
  });
  response.end(JSON.stringify(payload));
}

function sendStatic(request, response) {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  let filePath = path.join(FRONTEND_BUILD_DIR, safePath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(FRONTEND_BUILD_DIR, "index.html");
  }

  if (!filePath.startsWith(FRONTEND_BUILD_DIR) || !fs.existsSync(filePath)) {
    sendJson(response, 404, { error: "Not found." });
    return;
  }

  const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".txt": "text/plain; charset=utf-8",
  };
  response.writeHead(200, {
    "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
  });
  fs.createReadStream(filePath).pipe(response);
}

function parseBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("Request body is too large."));
      }
    });
    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });
  });
}

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    points: Number(row.points),
    wins: Number(row.wins),
    losses: Number(row.losses),
  };
}

function gameFromRow(row) {
  return {
    id: row.id,
    sport: row.sport,
    away: row.away,
    home: row.home,
    startsAt: row.starts_at,
    status: row.status,
    awayOdds: Number(row.away_odds),
    homeOdds: Number(row.home_odds),
    ou: row.ou === null ? null : Number(row.ou),
    storyline: row.storyline,
    outcomeTeam: row.outcome_team || null,
    score: row.away_score === null || row.home_score === null ? null : { away: Number(row.away_score), home: Number(row.home_score) },
    clock: row.clock || null,
    bettingLocked: Boolean(row.betting_locked),
  };
}

async function getAuthUser(request) {
  const header = request.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;

  const result = await pool.query(
    `SELECT users.*
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token = $1`,
    [token]
  );
  return result.rows[0] || null;
}

async function getLeaderboard() {
  await settleDueParlays();
  const result = await pool.query(
    `SELECT id, username, points, wins, losses
     FROM users
     ORDER BY points DESC, username ASC
     LIMIT 20`
  );
  return result.rows.map(publicUser);
}

async function maybeRefillUser(userId) {
  const result = await pool.query(
    `UPDATE users
     SET points = 100,
         depleted_at = NULL
     WHERE id = $1
       AND points <= 0
       AND depleted_at IS NOT NULL
       AND depleted_at <= now() - interval '24 hours'
     RETURNING id, username, points, wins, losses`,
    [userId]
  );
  if (result.rows[0]) return result.rows[0];

  const userResult = await pool.query(
    `SELECT id, username, points, wins, losses
     FROM users
     WHERE id = $1`,
    [userId]
  );
  return userResult.rows[0] || null;
}

async function settleDueParlays(userId = null) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT *
       FROM parlays
       WHERE result IS NULL
         AND created_at <= now() - interval '12 seconds'
         AND ($1::text IS NULL OR user_id = $1)
       FOR UPDATE`,
      [userId]
    );

    for (const parlay of result.rows) {
      const outcome = "win";
      await client.query(
        "UPDATE parlays SET result = $1, settled_at = now() WHERE id = $2",
        [outcome, parlay.id]
      );
      await client.query(
        "UPDATE users SET points = points + $1, wins = wins + 1, depleted_at = NULL WHERE id = $2",
        [Number(parlay.wager) + Number(parlay.potential_win), parlay.user_id]
      );
    }

    await client.query("COMMIT");
    return result.rowCount;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function initDatabase() {
  await pool.query(`
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
      clock TEXT,
      betting_locked BOOLEAN NOT NULL DEFAULT false
    );

    ALTER TABLE games ADD COLUMN IF NOT EXISTS betting_locked BOOLEAN NOT NULL DEFAULT false;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 1000,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      depleted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS depleted_at TIMESTAMPTZ;
    CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_unique ON users (lower(username));

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
  `);

  await seedDatabase();
}

async function seedDatabase() {
  const sports = [
    ["nba", "NBA"],
    ["nhl", "NHL"],
    ["mlb", "MLB"],
  ];

  const teams = [
    ["lal", "nba", "Los Angeles Lakers", "Lakers", "LAL"],
    ["phx", "nba", "Phoenix Suns", "Suns", "PHX"],
    ["okc", "nba", "Oklahoma City Thunder", "Thunder", "OKC"],
    ["bos-nba", "nba", "Boston Celtics", "Celtics", "BOS"],
    ["phi-nba", "nba", "Philadelphia 76ers", "76ers", "PHI"],
    ["min-nba", "nba", "Minnesota Timberwolves", "Wolves", "MIN"],
    ["sas", "nba", "San Antonio Spurs", "Spurs", "SAS"],
    ["nyk", "nba", "New York Knicks", "Knicks", "NYK"],
    ["det", "nba", "Detroit Pistons", "Pistons", "DET"],
    ["cle", "nba", "Cleveland Cavaliers", "Cavaliers", "CLE"],
    ["car", "nhl", "Carolina Hurricanes", "Hurricanes", "CAR"],
    ["ana", "nhl", "Anaheim Ducks", "Ducks", "ANA"],
    ["vgk", "nhl", "Vegas Golden Knights", "Golden Knights", "VGK"],
    ["mtl", "nhl", "Montreal Canadiens", "Canadiens", "MTL"],
    ["col", "nhl", "Colorado Avalanche", "Avalanche", "COL"],
    ["min-nhl", "nhl", "Minnesota Wild", "Wild", "MIN"],
    ["bos-nhl", "nhl", "Boston Bruins", "Bruins", "BOS"],
    ["buf", "nhl", "Buffalo Sabres", "Sabres", "BUF"],
    ["phi-nhl", "nhl", "Philadelphia Flyers", "Flyers", "PHI"],
    ["atl", "mlb", "Atlanta Braves", "Braves", "ATL"],
    ["sea", "mlb", "Seattle Mariners", "Mariners", "SEA"],
    ["lad", "mlb", "Los Angeles Dodgers", "Dodgers", "LAD"],
    ["nyy", "mlb", "New York Yankees", "Yankees", "NYY"],
    ["bal", "mlb", "Baltimore Orioles", "Orioles", "BAL"],
    ["hou-mlb", "mlb", "Houston Astros", "Astros", "HOU"],
    ["tex", "mlb", "Texas Rangers", "Rangers", "TEX"],
    ["sd", "mlb", "San Diego Padres", "Padres", "SD"],
    ["chc", "mlb", "Chicago Cubs", "Cubs", "CHC"],
    ["phi-mlb", "mlb", "Philadelphia Phillies", "Phillies", "PHI"],
    ["sf", "mlb", "San Francisco Giants", "Giants", "SF"],
    ["mia-mlb", "mlb", "Miami Marlins", "Marlins", "MIA"],
    ["cle-mlb", "mlb", "Cleveland Guardians", "Guardians", "CLE"],
    ["tb", "mlb", "Tampa Bay Rays", "Rays", "TB"],
    ["tor-mlb", "mlb", "Toronto Blue Jays", "Blue Jays", "TOR"],
    ["bos-mlb", "mlb", "Boston Red Sox", "Red Sox", "BOS"],
    ["min-mlb", "mlb", "Minnesota Twins", "Twins", "MIN"],
  ];

  const games = [
    ["nba-phx-okc-g4", "nba", "okc", "phx", "2026-04-29T20:30:00-05:00", "final", -220, 185, 226.5, "The Suns have been eliminated from playoffs.", "okc", 118, 101, null],
    ["nba-bos-phi-g7", "nba", "phi-nba", "bos-nba", "2026-05-03T18:30:00-05:00", "final", -115, -105, 216.5, "The Celtics have been eliminated from the playoffs.", "phi-nba", 111, 104, null],
    ["nba-lal-okc-g1", "nba", "okc", "lal", "2026-05-04T19:30:00-05:00", "live", -180, 155, 224.5, "Western Conference Semifinals Game 1", null, 66, 61, "Q3 7:42"],
    ["nba-min-sas-g1", "nba", "sas", "min-nba", "2026-05-04T20:30:00-05:00", "live", -145, 125, 221.5, "Western Conference Semifinals Game 1", null, 52, 48, "Q2 3:18"],
    ["nba-phi-nyk-g1", "nba", "nyk", "phi-nba", "2026-05-05T18:00:00-05:00", "upcoming", -140, 120, 216.5, "Eastern Conference Semifinals Game 1", null, null, null, null],
    ["nba-det-cle-g1", "nba", "cle", "det", "2026-05-05T19:30:00-05:00", "upcoming", -160, 135, 214.5, "Eastern Conference Semifinals Game 1", null, null, null, null],
    ["nba-lal-okc-g2", "nba", "okc", "lal", "2026-05-06T20:30:00-05:00", "upcoming", -175, 150, 225.5, "Thunder host Game 2 in Oklahoma City", null, null, null, null],
    ["nba-min-sas-g2", "nba", "sas", "min-nba", "2026-05-06T19:00:00-05:00", "upcoming", -140, 120, 220.5, "Spurs try to protect home court in Game 2", null, null, null, null],
    ["nba-nyk-phi-g2", "nba", "phi-nba", "nyk", "2026-05-07T18:30:00-05:00", "upcoming", -125, 105, 217.5, "Game 2 shifts pressure onto the road side", null, null, null, null],
    ["nba-cle-det-g2", "nba", "det", "cle", "2026-05-07T20:00:00-05:00", "upcoming", -105, -115, 215.5, "Pistons host a second-round playoff game", null, null, null, null],
    ["nba-okc-lal-g3", "nba", "lal", "okc", "2026-05-08T19:30:00-05:00", "upcoming", 125, -145, 224.5, "Game 3 shifts to Los Angeles; betting opens after Game 2", null, null, null, null, true],
    ["nba-sas-min-g3", "nba", "min-nba", "sas", "2026-05-08T20:30:00-05:00", "upcoming", -125, 105, 221.5, "Timberwolves host Game 3; betting opens after Game 2", null, null, null, null, true],
    ["nba-phi-nyk-g3", "nba", "nyk", "phi-nba", "2026-05-09T18:00:00-05:00", "upcoming", -135, 115, 216.5, "Knicks home crowd gets Game 3; betting opens after Game 2", null, null, null, null, true],
    ["nba-det-cle-g3", "nba", "cle", "det", "2026-05-09T19:30:00-05:00", "upcoming", -170, 145, 214.5, "Cavaliers host Game 3; betting opens after Game 2", null, null, null, null, true],
    ["nba-okc-lal-g4", "nba", "lal", "okc", "2026-05-10T18:30:00-05:00", "upcoming", 120, -140, 225.5, "Game 4 stays visible but is locked until closer to tip", null, null, null, null, true],
    ["nba-sas-min-g4", "nba", "min-nba", "sas", "2026-05-10T20:00:00-05:00", "upcoming", -130, 110, 220.5, "Game 4 in Minnesota stays locked until closer to tip", null, null, null, null, true],
    ["nba-nyk-phi-g4", "nba", "phi-nba", "nyk", "2026-05-11T18:30:00-05:00", "upcoming", -125, 105, 217.5, "Game 4 stays visible but is locked until closer to tip", null, null, null, null, true],
    ["nba-cle-det-g4", "nba", "det", "cle", "2026-05-11T20:00:00-05:00", "upcoming", -105, -115, 215.5, "Game 4 stays visible but is locked until closer to tip", null, null, null, null, true],
    ["nhl-bos-buf-g6", "nhl", "buf", "bos-nhl", "2026-05-01T18:30:00-05:00", "final", -170, 145, 5.5, "Buffalo eliminated Boston in six games", "buf", 4, 1, null],
    ["nhl-phi-car-g1", "nhl", "car", "phi-nhl", "2026-05-03T18:00:00-05:00", "final", -180, 155, 5.5, "Hurricanes took Game 1 at home", "car", 4, 2, null],
    ["nhl-phi-car-g2", "nhl", "car", "phi-nhl", "2026-05-04T18:00:00-05:00", "live", -180, 155, 5.5, "Carolina leads the second-round series 1-0", null, 2, 1, "P2 8:14"],
    ["nhl-ana-vgk-g1", "nhl", "vgk", "ana", "2026-05-04T20:30:00-05:00", "live", -165, 140, 6.0, "Western Conference Second Round Game 1", null, 2, 2, "P3 12:20"],
    ["nhl-min-col-g1", "nhl", "col", "min-nhl", "2026-05-04T21:00:00-05:00", "live", -175, 150, 5.5, "Avalanche open the second round at home", null, 3, 1, "P2 4:46"],
    ["nhl-ana-vgk-g2", "nhl", "vgk", "ana", "2026-05-05T20:30:00-05:00", "upcoming", -170, 145, 6.0, "Golden Knights host Game 2", null, null, null, null],
    ["nhl-min-col-g2", "nhl", "col", "min-nhl", "2026-05-05T20:30:00-05:00", "upcoming", -175, 150, 5.5, "Wild and Avalanche continue their second-round series", null, null, null, null],
    ["nhl-mtl-buf-g1", "nhl", "buf", "mtl", "2026-05-06T18:00:00-05:00", "upcoming", -160, 135, 5.5, "Eastern Conference Second Round Game 1 in Buffalo", null, null, null, null],
    ["nhl-mtl-buf-g2", "nhl", "buf", "mtl", "2026-05-06T20:00:00-05:00", "upcoming", -165, 140, 5.5, "Sabres host Game 2", null, null, null, null],
    ["nhl-car-phi-g3", "nhl", "phi-nhl", "car", "2026-05-07T18:30:00-05:00", "upcoming", 115, -135, 5.5, "The series shifts to Philadelphia for Game 3; betting opens after Game 2", null, null, null, null, true],
    ["nhl-col-min-g3", "nhl", "min-nhl", "col", "2026-05-07T20:30:00-05:00", "upcoming", 125, -145, 5.5, "Wild host Game 3; betting opens after Game 2", null, null, null, null, true],
    ["nhl-vgk-ana-g3", "nhl", "ana", "vgk", "2026-05-08T20:30:00-05:00", "upcoming", 100, -120, 6.0, "Ducks host Game 3; betting opens after Game 2", null, null, null, null, true],
    ["nhl-buf-mtl-g3", "nhl", "mtl", "buf", "2026-05-08T18:00:00-05:00", "upcoming", 105, -125, 5.5, "Canadiens host Game 3; betting opens after Game 2", null, null, null, null, true],
    ["nhl-car-phi-g4", "nhl", "phi-nhl", "car", "2026-05-09T18:30:00-05:00", "upcoming", 110, -130, 5.5, "Flyers host Game 4, locked until closer to puck drop", null, null, null, null, true],
    ["nhl-col-min-g4", "nhl", "min-nhl", "col", "2026-05-09T20:30:00-05:00", "upcoming", 120, -140, 5.5, "Wild host Game 4, locked until closer to puck drop", null, null, null, null, true],
    ["nhl-vgk-ana-g4", "nhl", "ana", "vgk", "2026-05-10T20:30:00-05:00", "upcoming", 105, -125, 6.0, "Ducks host Game 4, locked until closer to puck drop", null, null, null, null, true],
    ["nhl-buf-mtl-g4", "nhl", "mtl", "buf", "2026-05-10T18:00:00-05:00", "upcoming", 100, -120, 5.5, "Canadiens host Game 4, locked until closer to puck drop", null, null, null, null, true],
    ["mlb-mia-sf-426", "mlb", "sf", "mia-mlb", "2026-04-26T15:05:00-05:00", "final", -155, 135, 8.0, "Past MLB market already settled", "sf", 5, 3, null],
    ["mlb-chc-lad-426", "mlb", "lad", "chc", "2026-04-26T15:10:00-05:00", "final", -175, 150, 8.5, "Dodgers home market is resolved", "lad", 6, 4, null],
    ["mlb-tb-cle-427", "mlb", "cle-mlb", "tb", "2026-04-27T17:10:00-05:00", "final", -125, 105, 8.0, "Resolved Rays/Guardians market", "tb", 1, 2, null],
    ["mlb-bos-tor-427", "mlb", "tor-mlb", "bos-mlb", "2026-04-27T18:07:00-05:00", "final", -135, 115, 8.5, "Resolved Blue Jays home market", "tor-mlb", 3, 1, null],
    ["mlb-nyy-tex-427", "mlb", "tex", "nyy", "2026-04-27T19:05:00-05:00", "final", -105, -115, 8.5, "Yankees past market is resolved", "nyy", 4, 5, null],
    ["mlb-chc-sd-427", "mlb", "sd", "chc", "2026-04-27T20:40:00-05:00", "final", -130, 110, 8.0, "Padres past market is resolved", "sd", 6, 3, null],
    ["mlb-mia-lad-427", "mlb", "lad", "mia-mlb", "2026-04-27T21:10:00-05:00", "final", -255, 210, 8.5, "Dodgers past market is resolved", "lad", 8, 2, null],
    ["mlb-hou-bal-428", "mlb", "bal", "hou-mlb", "2026-04-28T17:35:00-05:00", "final", -115, -105, 8.5, "Orioles/Astros past market is resolved", "bal", 5, 4, null],
    ["mlb-sf-phi-428", "mlb", "phi-mlb", "sf", "2026-04-28T17:40:00-05:00", "final", -140, 120, 8.0, "Phillies past market is resolved", "phi-mlb", 7, 3, null],
    ["mlb-sea-min-428", "mlb", "min-mlb", "sea", "2026-04-28T18:40:00-05:00", "final", -110, -110, 7.5, "Mariners past market is resolved", "sea", 2, 4, null],
    ["mlb-atl-sea-501", "mlb", "sea", "atl", "2026-05-01T20:40:00-05:00", "final", -105, -115, 8.0, "Braves past market is resolved", "atl", 4, 6, null],
    ["mlb-bal-nyy-504", "mlb", "nyy", "bal", "2026-05-04T18:05:00-05:00", "live", -155, 135, 8.5, "Yankees host the Orioles on Monday", null, 4, 2, "Bot 5th"],
    ["mlb-lad-hou-504", "mlb", "hou-mlb", "lad", "2026-05-04T19:10:00-05:00", "live", 115, -135, 8.5, "Astros host the Dodgers in Houston", null, 3, 5, "Top 7th"],
    ["mlb-atl-sea-504", "mlb", "sea", "atl", "2026-05-04T20:40:00-05:00", "live", -115, -105, 7.5, "Braves visit Seattle on Monday", null, 2, 3, "Top 6th"],
    ["mlb-tex-nyy-505", "mlb", "nyy", "tex", "2026-05-05T18:05:00-05:00", "upcoming", -140, 120, 8.5, "Yankees begin a series with Texas", null, null, null, null],
    ["mlb-sd-bal-505", "mlb", "bal", "sd", "2026-05-05T18:35:00-05:00", "upcoming", -115, -105, 8.0, "Padres/Orioles matchup for the live board", null, null, null, null],
    ["mlb-lad-hou-505", "mlb", "hou-mlb", "lad", "2026-05-05T19:10:00-05:00", "upcoming", 110, -130, 8.0, "Dodgers and Astros continue the set", null, null, null, null],
    ["mlb-atl-sea-505", "mlb", "sea", "atl", "2026-05-05T20:40:00-05:00", "upcoming", -110, -110, 7.5, "Braves continue the Mariners series", null, null, null, null],
    ["mlb-hou-bal-506", "mlb", "bal", "hou-mlb", "2026-05-06T17:35:00-05:00", "upcoming", -115, -105, 8.5, "Astros and Orioles continue the series", null, null, null, null],
    ["mlb-nyy-tb-506", "mlb", "tb", "nyy", "2026-05-06T17:50:00-05:00", "upcoming", 105, -125, 8.0, "Yankees visit Tampa Bay", null, null, null, null],
    ["mlb-chc-phi-506", "mlb", "phi-mlb", "chc", "2026-05-06T18:40:00-05:00", "upcoming", -135, 115, 8.0, "Cubs visit the Phillies for a featured slate matchup", null, null, null, null],
    ["mlb-atl-sea-506", "mlb", "sea", "atl", "2026-05-06T15:10:00-05:00", "upcoming", 105, -125, 8.0, "Braves wrap the Seattle series", null, null, null, null],
    ["mlb-sd-atl-507", "mlb", "atl", "sd", "2026-05-07T18:20:00-05:00", "upcoming", -145, 125, 8.5, "Padres visit the Braves", null, null, null, null],
    ["mlb-sea-bos-507", "mlb", "bos-mlb", "sea", "2026-05-07T18:10:00-05:00", "upcoming", -115, -105, 8.5, "Mariners and Red Sox on the expanded board", null, null, null, null],
    ["mlb-phi-chc-507", "mlb", "chc", "phi-mlb", "2026-05-07T19:05:00-05:00", "upcoming", 100, -120, 8.0, "Phillies/Cubs return matchup", null, null, null, null],
    ["mlb-chc-nyy-508", "mlb", "nyy", "chc", "2026-05-08T18:05:00-05:00", "upcoming", -170, 145, 8.5, "Cubs/Yankees presentation matchup", null, null, null, null],
    ["mlb-phi-sd-508", "mlb", "sd", "phi-mlb", "2026-05-08T20:40:00-05:00", "upcoming", -125, 105, 8.0, "Padres host the Phillies later in the week", null, null, null, null],
    ["mlb-atl-lad-508", "mlb", "lad", "atl", "2026-05-08T21:10:00-05:00", "upcoming", -155, 135, 8.5, "Braves open a road series at Dodger Stadium", null, null, null, null],
    ["mlb-cle-min-509", "mlb", "min-mlb", "cle-mlb", "2026-05-09T18:40:00-05:00", "upcoming", -125, 105, 7.5, "Guardians/Twins scout-only matchup for later in the week", null, null, null, null, true],
    ["mlb-tor-tex-509", "mlb", "tex", "tor-mlb", "2026-05-09T19:05:00-05:00", "upcoming", -135, 115, 8.5, "Blue Jays visit Texas, locked until the 3-day window", null, null, null, null, true],
    ["mlb-lad-sf-509", "mlb", "sf", "lad", "2026-05-09T20:05:00-05:00", "upcoming", 130, -150, 8.0, "Dodgers/Giants rivalry game visible for scouting", null, null, null, null, true],
  ];

  for (const [id, name] of sports) {
    await pool.query("INSERT INTO sports (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING", [id, name]);
  }

  for (const team of teams) {
    await pool.query(
      `INSERT INTO teams (id, sport_id, name, short_name, code)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET sport_id = EXCLUDED.sport_id, name = EXCLUDED.name, short_name = EXCLUDED.short_name, code = EXCLUDED.code`,
      team
    );
  }

  const seededGameIds = games.map((game) => game[0]);
  await pool.query(
    `DELETE FROM games
     WHERE id <> ALL($1::text[])
       AND id NOT IN (SELECT game_id FROM bets)
       AND id NOT IN (SELECT game_id FROM parlay_legs)`,
    [seededGameIds]
  );

  for (const game of games) {
    const normalizedGame = [...game.slice(0, 14), Boolean(game[14])];
    await pool.query(
      `INSERT INTO games (id, sport_id, home_team_id, away_team_id, starts_at, status, home_odds, away_odds, ou, storyline, outcome_team_id, home_score, away_score, clock, betting_locked)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         home_odds = EXCLUDED.home_odds,
         away_odds = EXCLUDED.away_odds,
         ou = EXCLUDED.ou,
         storyline = EXCLUDED.storyline,
         outcome_team_id = EXCLUDED.outcome_team_id,
         home_score = EXCLUDED.home_score,
         away_score = EXCLUDED.away_score,
         clock = EXCLUDED.clock,
         betting_locked = EXCLUDED.betting_locked`,
      normalizedGame
    );
  }
}

async function getGames(sport) {
  await maybeSyncRealScores();
  await maybeSyncRealOdds();
  const params = [];
  let where = "";
  if (sport) {
    params.push(sport);
    where = "WHERE games.sport_id = $1";
  }

  const result = await pool.query(
    `SELECT
       games.id,
       sports.id AS sport,
       away.name AS away,
       home.name AS home,
       games.starts_at,
       games.status,
       games.away_odds,
       games.home_odds,
       games.ou,
       games.storyline,
       outcome.name AS outcome_team,
       games.away_score,
       games.home_score,
       games.clock,
       games.betting_locked
     FROM games
     JOIN sports ON sports.id = games.sport_id
     JOIN teams away ON away.id = games.away_team_id
     JOIN teams home ON home.id = games.home_team_id
     LEFT JOIN teams outcome ON outcome.id = games.outcome_team_id
     ${where}
     ORDER BY games.starts_at ASC`,
    params
  );

  return result.rows.map(gameFromRow);
}

async function fetchOddsApiScores(sportId) {
  const sportKey = ODDS_API_SPORT_KEYS[sportId];
  if (!sportKey) return [];

  const url = new URL(`/v4/sports/${sportKey}/scores/`, ODDS_API_BASE_URL);
  url.searchParams.set("apiKey", ODDS_API_KEY);
  url.searchParams.set("daysFrom", "3");
  url.searchParams.set("dateFormat", "iso");

  const response = await fetch(url);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`The Odds API scores request failed for ${sportId}: ${response.status} ${message}`);
  }
  return response.json();
}

async function fetchOddsApiOdds(sportId) {
  const sportKey = ODDS_API_SPORT_KEYS[sportId];
  if (!sportKey) return [];

  const url = new URL(`/v4/sports/${sportKey}/odds/`, ODDS_API_BASE_URL);
  url.searchParams.set("apiKey", ODDS_API_KEY);
  url.searchParams.set("regions", "us");
  url.searchParams.set("markets", "h2h");
  url.searchParams.set("oddsFormat", "american");
  url.searchParams.set("dateFormat", "iso");

  const response = await fetch(url);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`The Odds API odds request failed for ${sportId}: ${response.status} ${message}`);
  }
  return response.json();
}

async function applyScoreEvent(sportId, event) {
  const homeName = event.home_team;
  const awayName = event.away_team;
  const homeScore = scoreForTeam(event, homeName);
  const awayScore = scoreForTeam(event, awayName);
  if (homeScore === null || awayScore === null) return false;

  const localGames = await pool.query(
    `SELECT games.id,
            games.starts_at,
            home.name AS home_name,
            away.name AS away_name,
            home.id AS home_id,
            away.id AS away_id
     FROM games
     JOIN teams home ON home.id = games.home_team_id
     JOIN teams away ON away.id = games.away_team_id
     WHERE games.sport_id = $1
       AND games.status <> 'final'`,
    [sportId]
  );

  const match = localGames.rows.find((game) => {
    const sameTeams =
      normalizeName(game.home_name) === normalizeName(homeName) &&
      normalizeName(game.away_name) === normalizeName(awayName);
    return sameTeams && sameGameDate(game.starts_at, event.commence_time);
  });
  if (!match) return false;

  const completed = Boolean(event.completed);
  const outcomeTeamId = completed
    ? homeScore > awayScore
      ? match.home_id
      : awayScore > homeScore
        ? match.away_id
        : null
    : null;

  await pool.query(
    `UPDATE games
     SET status = $1,
         home_score = $2,
         away_score = $3,
         outcome_team_id = $4,
         clock = $5,
         storyline = CASE
           WHEN $1 = 'final' THEN 'Adjusted from The Odds API final score.'
           ELSE storyline
         END
     WHERE id = $6`,
    [completed ? "final" : "live", homeScore, awayScore, outcomeTeamId, completed ? null : "Live", match.id]
  );
  return true;
}

async function applyOddsEvent(sportId, event) {
  const homeName = event.home_team;
  const awayName = event.away_team;
  const homeOdds = oddsForTeam(event, homeName);
  const awayOdds = oddsForTeam(event, awayName);
  if (homeOdds === null || awayOdds === null) return false;

  const localGames = await pool.query(
    `SELECT games.id,
            games.starts_at,
            home.name AS home_name,
            away.name AS away_name
     FROM games
     JOIN teams home ON home.id = games.home_team_id
     JOIN teams away ON away.id = games.away_team_id
     WHERE games.sport_id = $1
       AND games.status <> 'final'`,
    [sportId]
  );

  const match = localGames.rows.find((game) => {
    const sameTeams =
      normalizeName(game.home_name) === normalizeName(homeName) &&
      normalizeName(game.away_name) === normalizeName(awayName);
    return sameTeams && sameGameDate(game.starts_at, event.commence_time);
  });
  if (!match) return false;

  await pool.query(
    `UPDATE games
     SET home_odds = $1,
         away_odds = $2,
         storyline = CASE
           WHEN storyline ILIKE '%The Odds API%' THEN storyline
           ELSE storyline || ' Odds synced from The Odds API.'
         END
     WHERE id = $3`,
    [homeOdds, awayOdds, match.id]
  );
  return true;
}

async function syncRealScores({ force = false } = {}) {
  if (!ODDS_API_KEY) {
    lastScoreSyncResult = { skipped: true, reason: "ODDS_API_KEY is not set." };
    return lastScoreSyncResult;
  }
  if (!force && Date.now() - lastScoreSyncAt < SCORE_SYNC_INTERVAL_MS) {
    return lastScoreSyncResult;
  }

  const result = { skipped: false, checked: 0, updated: 0, sports: [] };
  for (const sportId of Object.keys(ODDS_API_SPORT_KEYS)) {
    const events = await fetchOddsApiScores(sportId);
    let updated = 0;
    for (const event of events) {
      if (await applyScoreEvent(sportId, event)) {
        updated += 1;
      }
    }
    result.checked += events.length;
    result.updated += updated;
    result.sports.push({ sport: sportId, checked: events.length, updated });
  }

  lastScoreSyncAt = Date.now();
  lastScoreSyncResult = { ...result, syncedAt: new Date(lastScoreSyncAt).toISOString() };
  return lastScoreSyncResult;
}

async function syncRealOdds({ force = false } = {}) {
  if (!ODDS_API_KEY) {
    lastOddsSyncResult = { skipped: true, reason: "ODDS_API_KEY is not set." };
    return lastOddsSyncResult;
  }
  if (!force && Date.now() - lastOddsSyncAt < ODDS_SYNC_INTERVAL_MS) {
    return lastOddsSyncResult;
  }

  const result = { skipped: false, checked: 0, updated: 0, sports: [] };
  for (const sportId of Object.keys(ODDS_API_SPORT_KEYS)) {
    const events = await fetchOddsApiOdds(sportId);
    let updated = 0;
    for (const event of events) {
      if (await applyOddsEvent(sportId, event)) {
        updated += 1;
      }
    }
    result.checked += events.length;
    result.updated += updated;
    result.sports.push({ sport: sportId, checked: events.length, updated });
  }

  lastOddsSyncAt = Date.now();
  lastOddsSyncResult = { ...result, syncedAt: new Date(lastOddsSyncAt).toISOString() };
  return lastOddsSyncResult;
}

async function maybeSyncRealScores() {
  try {
    await syncRealScores();
  } catch (error) {
    lastScoreSyncResult = { skipped: false, error: error.message, syncedAt: new Date().toISOString() };
  }
}

async function maybeSyncRealOdds() {
  try {
    await syncRealOdds();
  } catch (error) {
    lastOddsSyncResult = { skipped: false, error: error.message, syncedAt: new Date().toISOString() };
  }
}

async function handleRequest(request, response) {
  if (request.method === "OPTIONS") {
    sendJson(response, 200, { ok: true });
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, dbReady ? 200 : 503, {
        ok: dbReady,
        name: "HotShot API",
        database: dbReady ? "connected" : "unavailable",
        realScoreSync: {
          configured: Boolean(ODDS_API_KEY),
          last: lastScoreSyncResult,
        },
        realOddsSync: {
          configured: Boolean(ODDS_API_KEY),
          last: lastOddsSyncResult,
        },
        error: dbError,
        time: new Date().toISOString(),
      });
      return;
    }

    if (!dbReady) {
      sendJson(response, 503, { error: "Database is not connected. Check DATABASE_URL and PostgreSQL." });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/register") {
      const body = await parseBody(request);
      const username = String(body.username || "").trim();
      const password = String(body.password || "").trim();

      if (!username || password.length < 6) {
        sendJson(response, 400, { error: "Username is required and password must be at least 6 characters." });
        return;
      }

      const existingUser = await pool.query("SELECT id FROM users WHERE lower(username) = lower($1) LIMIT 1", [username]);
      if (existingUser.rowCount > 0) {
        sendJson(response, 409, { error: "Username already exists. Change at least one character." });
        return;
      }

      const id = makeId("user");
      const token = makeId("session");

      try {
        const userResult = await pool.query(
          `INSERT INTO users (id, username, password_hash, points, wins, losses)
           VALUES ($1, $2, $3, 1000, 0, 0)
           RETURNING id, username, points, wins, losses`,
          [id, username, hashPassword(password)]
        );
        await pool.query("INSERT INTO sessions (token, user_id) VALUES ($1, $2)", [token, id]);
        sendJson(response, 201, { token, user: publicUser(userResult.rows[0]) });
      } catch (error) {
        if (error.code === "23505") {
          sendJson(response, 409, { error: "Username already exists. Change at least one character." });
          return;
        }
        throw error;
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/login") {
      const body = await parseBody(request);
      const username = String(body.username || "").trim();
      const passwordHash = hashPassword(String(body.password || ""));
      const userResult = await pool.query(
        "SELECT id, username, points, wins, losses FROM users WHERE lower(username) = lower($1) AND password_hash = $2",
        [username, passwordHash]
      );

      const user = userResult.rows[0];
      if (!user) {
        sendJson(response, 401, { error: "Invalid username or password." });
        return;
      }

      const token = makeId("session");
      await pool.query("INSERT INTO sessions (token, user_id) VALUES ($1, $2)", [token, user.id]);
      sendJson(response, 200, { token, user: publicUser(await maybeRefillUser(user.id)) });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/me") {
      const user = await getAuthUser(request);
      if (!user) {
        sendJson(response, 401, { error: "Missing or invalid token." });
        return;
      }
      sendJson(response, 200, { user: publicUser(await maybeRefillUser(user.id)) });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/games") {
      sendJson(response, 200, { games: await getGames(url.searchParams.get("sport")) });
      return;
    }

    if ((request.method === "POST" || request.method === "GET") && url.pathname === "/api/sync-scores") {
      sendJson(response, 200, await syncRealScores({ force: true }));
      return;
    }

    if ((request.method === "POST" || request.method === "GET") && url.pathname === "/api/sync-odds") {
      sendJson(response, 200, await syncRealOdds({ force: true }));
      return;
    }

    if ((request.method === "POST" || request.method === "GET") && url.pathname === "/api/sync-api") {
      const scores = await syncRealScores({ force: true });
      const odds = await syncRealOdds({ force: true });
      sendJson(response, 200, { scores, odds });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/leaderboard") {
      sendJson(response, 200, { leaderboard: await getLeaderboard() });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/bets") {
      const user = await getAuthUser(request);
      if (!user) {
        sendJson(response, 401, { error: "Missing or invalid token." });
        return;
      }

      const result = await pool.query(
        `SELECT bets.*,
                teams.name AS team,
                games.sport_id AS sport,
                games.starts_at,
                games.status AS game_status,
                home.name AS home,
                away.name AS away
         FROM bets
         JOIN teams ON teams.id = bets.selected_team_id
         JOIN games ON games.id = bets.game_id
         JOIN teams home ON home.id = games.home_team_id
         JOIN teams away ON away.id = games.away_team_id
         WHERE bets.user_id = $1
         ORDER BY bets.created_at DESC`,
        [user.id]
      );
      sendJson(response, 200, { bets: result.rows });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/parlays") {
      const user = await getAuthUser(request);
      if (!user) {
        sendJson(response, 401, { error: "Missing or invalid token." });
        return;
      }

      await settleDueParlays(user.id);
      const result = await pool.query(
        `SELECT parlays.id,
                parlays.wager,
                parlays.potential_win,
                parlays.result,
                parlays.created_at,
                COALESCE(
                  json_agg(
                    json_build_object(
                      'id', parlay_legs.id,
                      'gameId', games.id,
                      'team', teams.name,
                      'odds', parlay_legs.odds,
                      'sport', games.sport_id,
                      'startsAt', games.starts_at
                    )
                    ORDER BY games.starts_at
                  ) FILTER (WHERE parlay_legs.id IS NOT NULL),
                  '[]'
                ) AS legs
         FROM parlays
         LEFT JOIN parlay_legs ON parlay_legs.parlay_id = parlays.id
         LEFT JOIN games ON games.id = parlay_legs.game_id
         LEFT JOIN teams ON teams.id = parlay_legs.selected_team_id
         WHERE parlays.user_id = $1
         GROUP BY parlays.id
         ORDER BY parlays.created_at DESC`,
        [user.id]
      );
      sendJson(response, 200, { parlays: result.rows });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/bets") {
      const user = await getAuthUser(request);
      if (!user) {
        sendJson(response, 401, { error: "Missing or invalid token." });
        return;
      }

      const body = await parseBody(request);
      const gameId = String(body.gameId || "");
      const teamName = String(body.team || "");
      const wager = Number(body.wager || 0);
      await maybeRefillUser(user.id);

      if (!Number.isFinite(wager) || wager < 10) {
        sendJson(response, 400, { error: "Wager must be at least 10 points." });
        return;
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const userResult = await client.query("SELECT * FROM users WHERE id = $1 FOR UPDATE", [user.id]);
        const currentUser = userResult.rows[0];
        if (!currentUser || currentUser.points < wager) {
          await client.query("ROLLBACK");
          sendJson(response, 400, { error: "Not enough points." });
          return;
        }

        const gameResult = await client.query(
          `SELECT games.*, home.name AS home_name, away.name AS away_name, home.id AS home_id, away.id AS away_id
           FROM games
           JOIN teams home ON home.id = games.home_team_id
           JOIN teams away ON away.id = games.away_team_id
           WHERE games.id = $1`,
          [gameId]
        );
        const game = gameResult.rows[0];
        if (!game) {
          await client.query("ROLLBACK");
          sendJson(response, 404, { error: "Game not found." });
          return;
        }
        if (game.status === "final" || game.betting_locked) {
          await client.query("ROLLBACK");
          sendJson(response, 409, { error: game.status === "final" ? "That market is already resolved." : "That market is locked until closer to game day." });
          return;
        }

        const selectedTeamId = teamName === game.home_name ? game.home_id : teamName === game.away_name ? game.away_id : null;
        if (!selectedTeamId) {
          await client.query("ROLLBACK");
          sendJson(response, 400, { error: "Team must be the home or away side." });
          return;
        }

        const duplicateResult = await client.query(
          `SELECT game_id
           FROM bets
           WHERE user_id = $1
             AND game_id = $2
           UNION
           SELECT parlay_legs.game_id
           FROM parlays
           JOIN parlay_legs ON parlay_legs.parlay_id = parlays.id
           WHERE parlays.user_id = $1
             AND parlay_legs.game_id = $2
           LIMIT 1`,
          [currentUser.id, game.id]
        );
        if (duplicateResult.rowCount > 0) {
          await client.query("ROLLBACK");
          sendJson(response, 409, { error: "You have already placed a bet on it." });
          return;
        }

        const odds = selectedTeamId === game.home_id ? game.home_odds : game.away_odds;
        const betId = makeId("bet");
        const potentialWin = payout(wager, odds);

        const betResult = await client.query(
          `INSERT INTO bets (id, user_id, game_id, selected_team_id, odds, wager, potential_win)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [betId, currentUser.id, game.id, selectedTeamId, odds, wager, potentialWin]
        );
        const updatedUser = await client.query(
          `UPDATE users
           SET points = points - $1,
               depleted_at = CASE
                 WHEN points - $1 <= 0 THEN COALESCE(depleted_at, now())
                 ELSE depleted_at
               END
           WHERE id = $2
           RETURNING id, username, points, wins, losses`,
          [wager, currentUser.id]
        );

        await client.query("COMMIT");
        sendJson(response, 201, { bet: betResult.rows[0], user: publicUser(updatedUser.rows[0]) });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/settle-bet") {
      const user = await getAuthUser(request);
      if (!user) {
        sendJson(response, 401, { error: "Missing or invalid token." });
        return;
      }

      const body = await parseBody(request);
      const betId = String(body.betId || "");
      const outcomeTeam = String(body.outcomeTeam || "");

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const betResult = await client.query(
          `SELECT bets.*,
                  teams.name AS selected_team,
                  games.id AS game_id
           FROM bets
           JOIN teams ON teams.id = bets.selected_team_id
           JOIN games ON games.id = bets.game_id
           WHERE bets.id = $1
             AND bets.user_id = $2
           FOR UPDATE`,
          [betId, user.id]
        );
        const bet = betResult.rows[0];
        if (!bet) {
          await client.query("ROLLBACK");
          sendJson(response, 404, { error: "Bet not found." });
          return;
        }

        if (bet.result) {
          const currentUser = await client.query("SELECT id, username, points, wins, losses FROM users WHERE id = $1", [user.id]);
          await client.query("COMMIT");
          sendJson(response, 200, { bet, user: publicUser(currentUser.rows[0]), leaderboard: await getLeaderboard() });
          return;
        }

        const won = bet.selected_team === outcomeTeam;
        const result = won ? "win" : "loss";
        await client.query(
          "UPDATE bets SET result = $1, settled_at = now() WHERE id = $2",
          [result, bet.id]
        );

        const updatedUser = won
          ? await client.query(
              "UPDATE users SET points = points + $1, wins = wins + 1, depleted_at = NULL WHERE id = $2 RETURNING id, username, points, wins, losses",
              [Number(bet.wager) + Number(bet.potential_win), user.id]
            )
          : await client.query(
              `UPDATE users
               SET losses = losses + 1,
                   depleted_at = CASE
                     WHEN points <= 0 THEN COALESCE(depleted_at, now())
                     ELSE depleted_at
                   END
               WHERE id = $1
               RETURNING id, username, points, wins, losses`,
              [user.id]
            );

        await client.query("COMMIT");
        sendJson(response, 200, { result, user: publicUser(updatedUser.rows[0]), leaderboard: await getLeaderboard() });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/parlays") {
      const user = await getAuthUser(request);
      if (!user) {
        sendJson(response, 401, { error: "Missing or invalid token." });
        return;
      }

      const body = await parseBody(request);
      const legs = Array.isArray(body.legs) ? body.legs : [];
      const wager = Number(body.wager || 0);
      await maybeRefillUser(user.id);

      if (legs.length < 2 || !Number.isFinite(wager) || wager < 10) {
        sendJson(response, 400, { error: "Parlays need at least two legs and a valid wager." });
        return;
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const userResult = await client.query("SELECT * FROM users WHERE id = $1 FOR UPDATE", [user.id]);
        const currentUser = userResult.rows[0];
        if (!currentUser || currentUser.points < wager) {
          await client.query("ROLLBACK");
          sendJson(response, 400, { error: "Not enough points." });
          return;
        }

        const requestedGameIds = legs.map((leg) => String(leg.gid || leg.gameId || "")).filter(Boolean);
        if (new Set(requestedGameIds).size !== requestedGameIds.length) {
          await client.query("ROLLBACK");
          sendJson(response, 409, { error: "You have already placed a bet on it." });
          return;
        }

        const duplicateResult = await client.query(
          `SELECT game_id
           FROM bets
           WHERE user_id = $1
             AND game_id = ANY($2::text[])
           UNION
           SELECT parlay_legs.game_id
           FROM parlays
           JOIN parlay_legs ON parlay_legs.parlay_id = parlays.id
           WHERE parlays.user_id = $1
             AND parlay_legs.game_id = ANY($2::text[])
           LIMIT 1`,
          [currentUser.id, requestedGameIds]
        );
        if (duplicateResult.rowCount > 0) {
          await client.query("ROLLBACK");
          sendJson(response, 409, { error: "You have already placed a bet on it." });
          return;
        }

        const parlayId = makeId("parlay");
        let decimalOdds = 1;
        const insertedLegs = [];
        let parlayResult = await client.query(
          `INSERT INTO parlays (id, user_id, wager, potential_win)
           VALUES ($1, $2, $3, 0)
           RETURNING *`,
          [parlayId, currentUser.id, wager]
        );

        for (const leg of legs) {
          const gameResult = await client.query(
            `SELECT games.*, home.name AS home_name, away.name AS away_name, home.id AS home_id, away.id AS away_id
             FROM games
             JOIN teams home ON home.id = games.home_team_id
             JOIN teams away ON away.id = games.away_team_id
             WHERE games.id = $1`,
            [leg.gid || leg.gameId]
          );
          const game = gameResult.rows[0];
          if (!game || game.status === "final" || game.betting_locked) {
            await client.query("ROLLBACK");
            sendJson(response, 400, { error: "One parlay leg is invalid, locked, or already resolved." });
            return;
          }

          const teamName = String(leg.team || "");
          const selectedTeamId = teamName === game.home_name ? game.home_id : teamName === game.away_name ? game.away_id : null;
          if (!selectedTeamId) {
            await client.query("ROLLBACK");
            sendJson(response, 400, { error: "Each parlay leg needs a valid selected team." });
            return;
          }

          const odds = Number(leg.odds || (selectedTeamId === game.home_id ? game.home_odds : game.away_odds));
          decimalOdds *= odds > 0 ? 1 + odds / 100 : 1 + 100 / Math.abs(odds);
          const legId = makeId("leg");

          const legResult = await client.query(
            `INSERT INTO parlay_legs (id, parlay_id, game_id, selected_team_id, odds)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [legId, parlayId, game.id, selectedTeamId, odds]
          );
          insertedLegs.push(legResult.rows[0]);
        }

        const potentialWin = Math.round(wager * (decimalOdds - 1));
        parlayResult = await client.query(
          `UPDATE parlays
           SET potential_win = $1
           WHERE id = $2
           RETURNING *`,
          [potentialWin, parlayId]
        );
        const updatedUser = await client.query(
          `UPDATE users
           SET points = points - $1,
               depleted_at = CASE
                 WHEN points - $1 <= 0 THEN COALESCE(depleted_at, now())
                 ELSE depleted_at
               END
           WHERE id = $2
           RETURNING id, username, points, wins, losses`,
          [wager, currentUser.id]
        );

        await client.query("COMMIT");
        sendJson(response, 201, { parlay: { ...parlayResult.rows[0], legs: insertedLegs }, user: publicUser(updatedUser.rows[0]) });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/settle-parlay") {
      const user = await getAuthUser(request);
      if (!user) {
        sendJson(response, 401, { error: "Missing or invalid token." });
        return;
      }

      const body = await parseBody(request);
      const parlayId = String(body.parlayId || "");
      const result = String(body.result || "");
      if (!["win", "loss"].includes(result)) {
        sendJson(response, 400, { error: "Parlay result must be win or loss." });
        return;
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const parlayResult = await client.query(
          `SELECT *
           FROM parlays
           WHERE id = $1
             AND user_id = $2
           FOR UPDATE`,
          [parlayId, user.id]
        );
        const parlay = parlayResult.rows[0];
        if (!parlay) {
          await client.query("ROLLBACK");
          sendJson(response, 404, { error: "Parlay not found." });
          return;
        }

        if (parlay.result) {
          const currentUser = await client.query("SELECT id, username, points, wins, losses FROM users WHERE id = $1", [user.id]);
          await client.query("COMMIT");
          sendJson(response, 200, { parlay, user: publicUser(currentUser.rows[0]), leaderboard: await getLeaderboard() });
          return;
        }

        const settledParlay = await client.query(
          "UPDATE parlays SET result = $1, settled_at = now() WHERE id = $2 RETURNING *",
          [result, parlay.id]
        );
        const updatedUser =
          result === "win"
            ? await client.query(
                "UPDATE users SET points = points + $1, wins = wins + 1, depleted_at = NULL WHERE id = $2 RETURNING id, username, points, wins, losses",
                [Number(parlay.wager) + Number(parlay.potential_win), user.id]
              )
            : await client.query(
                `UPDATE users
                 SET losses = losses + 1,
                     depleted_at = CASE
                       WHEN points <= 0 THEN COALESCE(depleted_at, now())
                       ELSE depleted_at
                     END
                 WHERE id = $1
                 RETURNING id, username, points, wins, losses`,
                [user.id]
              );

        await client.query("COMMIT");
        sendJson(response, 200, { parlay: settledParlay.rows[0], user: publicUser(updatedUser.rows[0]), leaderboard: await getLeaderboard() });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
      return;
    }

    if (request.url.startsWith("/api/")) {
      sendJson(response, 404, { error: "Route not found." });
      return;
    }

    sendStatic(request, response);
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Server error." });
  }
}

async function start() {
  try {
    await initDatabase();
    dbReady = true;
  } catch (error) {
    dbReady = false;
    dbError = error.message;
    console.error("Database initialization failed:", error.message);
  }

  http.createServer(handleRequest).listen(PORT, HOST, () => {
    console.log(`HotShot API running at http://${HOST}:${PORT}`);
  });
}

start();
