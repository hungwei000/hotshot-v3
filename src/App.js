import { startTransition, useDeferredValue, useEffect, useRef, useState } from "react";

const DAY_MS = 24 * 60 * 60 * 1000;
const BETTING_WINDOW_DAYS = 3;

const SPORT_CONFIG = {
  nba: { label: "NBA", icon: "🏀", accent: "#f97316" },
  nhl: { label: "NHL", icon: "🏒", accent: "#38bdf8" },
  mlb: { label: "MLB", icon: "⚾", accent: "#22c55e" },
};

const assetPath = (path) => `${process.env.PUBLIC_URL || ""}${path}`;

const SPORT_BACKGROUNDS = {
  nba: assetPath("/sports-bg/nba.png"),
  nhl: assetPath("/sports-bg/nhl.png"),
  mlb: assetPath("/sports-bg/mlb.png"),
};

const PAGE_BACKGROUNDS = {
  games: null,
  parlays: SPORT_BACKGROUNDS.nhl,
  history: SPORT_BACKGROUNDS.nba,
  leaderboard: SPORT_BACKGROUNDS.mlb,
};

const BACKGROUND_POSITION = "center top";
const BACKGROUND_SIZE = "contain";

const getSportBackgroundPosition = (sportKey) => (sportKey === "nba" ? "63% top" : BACKGROUND_POSITION);

const getApiBaseUrl = () => {
  const configured = process.env.REACT_APP_API_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    return "http://127.0.0.1:4000/api";
  }
  return "/api";
};

const API_BASE_URL = getApiBaseUrl();
const AUTH_TOKEN_KEY = "hotshot_api_token";

async function apiRequest(path, options = {}) {
  if (!API_BASE_URL) {
    throw new Error("API URL is not configured.");
  }

  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "API request failed.");
  }
  return payload;
}

const groupApiGames = (games) =>
  games.reduce(
    (groups, game) => {
      if (!groups[game.sport]) groups[game.sport] = [];
      groups[game.sport].push(game);
      return groups;
    },
    { nba: [], nhl: [], mlb: [] }
  );

const normalizeApiBet = (bet) => ({
  id: bet.id,
  gameId: bet.game_id || bet.gameId,
  team: bet.team,
  odds: Number(bet.odds),
  wager: Number(bet.wager),
  potentialWin: Number(bet.potential_win ?? bet.potentialWin),
  result: bet.result,
  type: "moneyline",
  sport: bet.sport,
  startsAt: bet.starts_at || bet.startsAt,
});

const normalizeApiParlay = (parlay) => ({
  id: parlay.id,
  wager: Number(parlay.wager),
  potentialWin: Number(parlay.potential_win ?? parlay.potentialWin),
  result: parlay.result,
  legs: (parlay.legs || []).map((leg) => ({
    gid: leg.gameId || leg.game_id,
    gameId: leg.gameId || leg.game_id,
    team: leg.team,
    odds: Number(leg.odds),
    sport: leg.sport,
    startsAt: leg.startsAt || leg.starts_at,
  })),
});

const TEAM_LIBRARY = {
  nba: [
    { name: "Los Angeles Lakers", short: "Lakers", code: "LAL", icon: "⭐", colors: ["#fdb927", "#552583"], attack: 92, defense: 85, style: "star-heavy late-game creation" },
    { name: "San Antonio Spurs", short: "Spurs", code: "SAS", icon: "✦", colors: ["#c4ced4", "#000000"], attack: 88, defense: 89, style: "length around the rim" },
    { name: "Minnesota Timberwolves", short: "Wolves", code: "MIN", icon: "🐺", colors: ["#0c2340", "#236192"], attack: 85, defense: 91, style: "length and transition defense" },
    { name: "Oklahoma City Thunder", short: "Thunder", code: "OKC", icon: "⚡", colors: ["#007ac1", "#ef3b24"], attack: 95, defense: 91, style: "drive-and-kick pressure" },
    { name: "Detroit Pistons", short: "Pistons", code: "DET", icon: "🏎️", colors: ["#c8102e", "#1d42ba"], attack: 86, defense: 88, style: "physical downhill creation" },
    { name: "Philadelphia 76ers", short: "76ers", code: "PHI", icon: "🔔", colors: ["#006bb6", "#ed174c"], attack: 88, defense: 84, style: "free-throw pressure" },
    { name: "New York Knicks", short: "Knicks", code: "NYK", icon: "🗽", colors: ["#006bb6", "#f58426"], attack: 86, defense: 87, style: "rebounding and paint attacks" },
    { name: "Cleveland Cavaliers", short: "Cavaliers", code: "CLE", icon: "⚔️", colors: ["#860038", "#fdbb30"], attack: 87, defense: 88, style: "guard creation and paint size" },
    { name: "Boston Celtics", short: "Celtics", code: "BOS", icon: "☘️", colors: ["#008348", "#bb9753"], attack: 94, defense: 89, style: "five-out shot volume" },
    { name: "Golden State Warriors", short: "Warriors", code: "GSW", icon: "🌉", colors: ["#1d428a", "#ffc72c"], attack: 90, defense: 82, style: "motion spacing and pull-up pace" },
    { name: "Milwaukee Bucks", short: "Bucks", code: "MIL", icon: "🦌", colors: ["#00471b", "#eee1c6"], attack: 89, defense: 87, style: "rim pressure with size" },
    { name: "Phoenix Suns", short: "Suns", code: "PHX", icon: "🌞", colors: ["#1d1160", "#e56020"], attack: 91, defense: 81, style: "midrange-heavy scoring bursts" },
    { name: "Denver Nuggets", short: "Nuggets", code: "DEN", icon: "⛰️", colors: ["#0e2240", "#fec524"], attack: 93, defense: 86, style: "inside-out half-court balance" },
    { name: "Miami Heat", short: "Heat", code: "MIA", icon: "🔥", colors: ["#98002e", "#f9a01b"], attack: 84, defense: 88, style: "grind-and-switch defense" },
    { name: "Dallas Mavericks", short: "Mavericks", code: "DAL", icon: "🤠", colors: ["#00538c", "#b8c4ca"], attack: 91, defense: 80, style: "heliocentric shot-making" },
    { name: "Houston Rockets", short: "Rockets", code: "HOU", icon: "🚀", colors: ["#ce1141", "#000000"], attack: 87, defense: 86, style: "rim pressure and switchable wings" },
    { name: "Orlando Magic", short: "Magic", code: "ORL", icon: "✨", colors: ["#0077c0", "#c4ced4"], attack: 84, defense: 90, style: "long defensive rotations" },
    { name: "Toronto Raptors", short: "Raptors", code: "TOR", icon: "🦖", colors: ["#ce1141", "#000000"], attack: 85, defense: 84, style: "athletic pressure and pace" },
    { name: "Atlanta Hawks", short: "Hawks", code: "ATL", icon: "🪶", colors: ["#e03a3e", "#c1d32f"], attack: 89, defense: 80, style: "guard-led shot creation" },
    { name: "Portland Trail Blazers", short: "Blazers", code: "POR", icon: "🌲", colors: ["#e03a3e", "#000000"], attack: 83, defense: 80, style: "young transition scoring" },
    { name: "Charlotte Hornets", short: "Hornets", code: "CHA", icon: "🐝", colors: ["#1d1160", "#00788c"], attack: 84, defense: 81, style: "spread pick-and-roll tempo" },
  ],
  nhl: [
    { name: "Carolina Hurricanes", short: "Hurricanes", code: "CAR", icon: "🌀", colors: ["#cc0000", "#000000"], attack: 87, defense: 90, style: "relentless shot volume" },
    { name: "Philadelphia Flyers", short: "Flyers", code: "PHI", icon: "🪽", colors: ["#f74902", "#000000"], attack: 84, defense: 83, style: "heavy boards and net drives" },
    { name: "Buffalo Sabres", short: "Sabres", code: "BUF", icon: "⚔️", colors: ["#002654", "#fcb514"], attack: 86, defense: 84, style: "north-south rush pressure" },
    { name: "Montreal Canadiens", short: "Canadiens", code: "MTL", icon: "🔵", colors: ["#af1e2d", "#192168"], attack: 78, defense: 77, style: "young speed on the wings" },
    { name: "Minnesota Wild", short: "Wild", code: "MIN", icon: "🌲", colors: ["#154734", "#a6192e"], attack: 84, defense: 85, style: "tight checking and rush counters" },
    { name: "Colorado Avalanche", short: "Avalanche", code: "COL", icon: "🏔️", colors: ["#6f263d", "#236192"], attack: 90, defense: 84, style: "line-rush acceleration" },
    { name: "Vegas Golden Knights", short: "Golden Knights", code: "VGK", icon: "🛡️", colors: ["#b4975a", "#333f42"], attack: 86, defense: 86, style: "heavy forecheck and layers" },
    { name: "Anaheim Ducks", short: "Ducks", code: "ANA", icon: "🦆", colors: ["#f47a38", "#b9975b"], attack: 85, defense: 81, style: "crease pressure and chaos" },
    { name: "Toronto Maple Leafs", short: "Leafs", code: "TOR", icon: "🍁", colors: ["#00205b", "#ffffff"], attack: 88, defense: 81, style: "rush chances off quick exits" },
    { name: "Boston Bruins", short: "Bruins", code: "BOS", icon: "🐻", colors: ["#ffb81c", "#000000"], attack: 84, defense: 89, style: "disciplined defensive walls" },
    { name: "Tampa Bay Lightning", short: "Lightning", code: "TBL", icon: "⚡", colors: ["#002868", "#ffffff"], attack: 87, defense: 82, style: "power-play finishing" },
    { name: "Edmonton Oilers", short: "Oilers", code: "EDM", icon: "🛢️", colors: ["#041e42", "#ff4c00"], attack: 91, defense: 78, style: "elite top-line creation" },
    { name: "Calgary Flames", short: "Flames", code: "CGY", icon: "🔥", colors: ["#c8102e", "#f1be48"], attack: 79, defense: 80, style: "cycle pressure in-zone" },
    { name: "New York Rangers", short: "Rangers", code: "NYR", icon: "🗽", colors: ["#0038a8", "#ce1126"], attack: 85, defense: 85, style: "transition counters" },
    { name: "Seattle Kraken", short: "Kraken", code: "SEA", icon: "🌊", colors: ["#001628", "#99d9d9"], attack: 81, defense: 83, style: "structured line changes" },
    { name: "Pittsburgh Penguins", short: "Penguins", code: "PIT", icon: "🐧", colors: ["#fcb514", "#000000"], attack: 83, defense: 80, style: "veteran slot passing" },
    { name: "Dallas Stars", short: "Stars", code: "DAL", icon: "⭐", colors: ["#006847", "#8f8f8c"], attack: 86, defense: 86, style: "layered forecheck pressure" },
    { name: "Utah Mammoth", short: "Mammoth", code: "UTA", icon: "🏔️", colors: ["#6cace4", "#010101"], attack: 83, defense: 82, style: "young speed through neutral ice" },
    { name: "Ottawa Senators", short: "Senators", code: "OTT", icon: "🏛️", colors: ["#c52032", "#000000"], attack: 80, defense: 79, style: "direct entries and point shots" },
    { name: "Los Angeles Kings", short: "Kings", code: "LAK", icon: "👑", colors: ["#a2aaad", "#111111"], attack: 82, defense: 82, style: "structured neutral-zone pressure" },
  ],
  mlb: [
    { name: "New York Yankees", short: "Yankees", code: "NYY", icon: "🧢", colors: ["#132448", "#c4ced4"], attack: 90, defense: 84, style: "deep-count power" },
    { name: "Houston Astros", short: "Astros", code: "HOU", icon: "🚀", colors: ["#002d62", "#eb6e1f"], attack: 88, defense: 86, style: "barrel-heavy contact" },
    { name: "Los Angeles Dodgers", short: "Dodgers", code: "LAD", icon: "🌴", colors: ["#005a9c", "#ffffff"], attack: 93, defense: 87, style: "depth through the order" },
    { name: "Atlanta Braves", short: "Braves", code: "ATL", icon: "🪓", colors: ["#ce1141", "#13274f"], attack: 91, defense: 82, style: "slugging early in counts" },
    { name: "San Diego Padres", short: "Padres", code: "SD", icon: "🌴", colors: ["#2f241d", "#ffc425"], attack: 84, defense: 81, style: "contact plus speed" },
    { name: "Baltimore Orioles", short: "Orioles", code: "BAL", icon: "🟠", colors: ["#df4601", "#000000"], attack: 86, defense: 82, style: "young power through the order" },
    { name: "Chicago Cubs", short: "Cubs", code: "CHC", icon: "🐻", colors: ["#0e3386", "#cc3433"], attack: 83, defense: 80, style: "gap power and hustle" },
    { name: "Philadelphia Phillies", short: "Phillies", code: "PHI", icon: "🔔", colors: ["#e81828", "#002d72"], attack: 87, defense: 81, style: "lefty power and pressure innings" },
    { name: "Seattle Mariners", short: "Mariners", code: "SEA", icon: "⚓", colors: ["#0c2c56", "#005c5c"], attack: 80, defense: 86, style: "pitching-first rhythm" },
    { name: "Texas Rangers", short: "Rangers", code: "TEX", icon: "🤠", colors: ["#003278", "#c0111f"], attack: 87, defense: 79, style: "aggressive base running" },
    { name: "Miami Marlins", short: "Marlins", code: "MIA", icon: "🌊", colors: ["#00a3e0", "#ef3340"], attack: 77, defense: 78, style: "speed and bullpen matchups" },
    { name: "Boston Red Sox", short: "Red Sox", code: "BOS", icon: "🧦", colors: ["#bd3039", "#0c2340"], attack: 85, defense: 79, style: "line-drive pressure" },
    { name: "Toronto Blue Jays", short: "Blue Jays", code: "TOR", icon: "🍁", colors: ["#134a8e", "#e8291c"], attack: 84, defense: 82, style: "patient power contact" },
    { name: "Cleveland Guardians", short: "Guardians", code: "CLE", icon: "🪽", colors: ["#e31937", "#0c2340"], attack: 80, defense: 86, style: "contact and clean defense" },
    { name: "Tampa Bay Rays", short: "Rays", code: "TB", icon: "☀️", colors: ["#092c5c", "#8fbce6"], attack: 82, defense: 84, style: "platoon advantages" },
    { name: "Pittsburgh Pirates", short: "Pirates", code: "PIT", icon: "☠️", colors: ["#fdb827", "#27251f"], attack: 79, defense: 80, style: "young bats and speed" },
    { name: "Los Angeles Angels", short: "Angels", code: "LAA", icon: "😇", colors: ["#ba0021", "#003263"], attack: 81, defense: 78, style: "power swings early" },
    { name: "Chicago White Sox", short: "White Sox", code: "CWS", icon: "⚫", colors: ["#c4ced4", "#27251f"], attack: 76, defense: 77, style: "bullpen survival spots" },
    { name: "San Francisco Giants", short: "Giants", code: "SF", icon: "🌉", colors: ["#fd5a1e", "#27251f"], attack: 82, defense: 83, style: "late-inning bullpen mix" },
    { name: "St. Louis Cardinals", short: "Cardinals", code: "STL", icon: "🐦", colors: ["#c41e3a", "#0c2340"], attack: 81, defense: 84, style: "situational hitting" },
    { name: "Minnesota Twins", short: "Twins", code: "MIN", icon: "👥", colors: ["#002b5c", "#d31145"], attack: 82, defense: 83, style: "pull-side power and bullpen matchups" },
    { name: "Kansas City Royals", short: "Royals", code: "KC", icon: "👑", colors: ["#004687", "#bd9b60"], attack: 80, defense: 84, style: "speed and contact pressure" },
  ],
};

const COMMUNITY_USERS = [
  "SharpShooter99",
  "BetKing_Ole",
  "NBAGuru",
  "PuckLuck",
  "DiamondPlay",
  "Swish_City",
  "HatTrickHero",
  "OddsWizard",
  "ClutchBets",
  "MoneyMike",
  "Parlay_Pete",
  "LocksOnly",
  "VegasVince",
  "SlamDunkSam",
];

const HISTORY_NOTES = {
  nba: ["late defensive stand", "second-unit scoring run", "paint pressure spike", "high-tempo third quarter", "half-court grind"],
  nhl: ["net-front traffic surge", "special teams edge", "neutral-zone reset", "goalie steal in the third", "cycle pressure finish"],
  mlb: ["bullpen squeeze late", "two-out rally", "early homer burst", "contact-heavy middle innings", "shutdown relief finish"],
};

const STORYLINES = [
  "pace against poise",
  "shot quality versus shot volume",
  "bench depth against top-end talent",
  "pressure defense against late-game shot making",
  "transition chances against half-court control",
];

const SCOUT_PROMPTS = [
  "Compare the matchup",
  "Who has the better recent form?",
  "Which side looks stronger late?",
  "What does the scoring trend say?",
];

const ELIMINATED_TEAM_MESSAGES = [
  { terms: ["celtics", "boston celtics", "bos"], message: "The Celtics have been eliminated from the playoffs." },
  { terms: ["warriors", "golden state", "gsw"], message: "The Warriors have been eliminated from the playoffs." },
  { terms: ["bucks", "milwaukee", "mil"], message: "The Bucks have been eliminated from the playoffs." },
  { terms: ["nuggets", "denver", "den"], message: "The Nuggets have been eliminated from the playoffs." },
  { terms: ["heat", "miami", "mia"], message: "The Heat have been eliminated from playoffs." },
  { terms: ["suns", "phoenix", "phx"], message: "The Suns have been eliminated from playoffs." },
  { terms: ["leafs", "maple leafs", "toronto maple", "tor"], message: "The Leafs have been eliminated from playoffs." },
  { terms: ["flames", "calgary", "cgy"], message: "The Flames have been eliminated from playoffs." },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const hashString = (value) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const seededNumber = (seed, min = 0, max = 1) => {
  const raw = Math.sin(hashString(String(seed)) * 12.9898) * 43758.5453123;
  const normalized = raw - Math.floor(raw);
  return min + normalized * (max - min);
};

const addDays = (date, amount) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const startOfDay = (dateValue) => {
  const next = new Date(dateValue);
  next.setHours(0, 0, 0, 0);
  return next;
};

const daysUntil = (dateValue) => {
  const diff = startOfDay(dateValue).getTime() - startOfDay(new Date()).getTime();
  return Math.round(diff / DAY_MS);
};

const formatOdds = (odds) => (odds > 0 ? `+${odds}` : `${odds}`);

const calcPayout = (wager, odds) => (odds > 0 ? Math.round(wager * (odds / 100)) : Math.round(wager * (100 / Math.abs(odds))));

const americanToProbability = (odds) => (odds < 0 ? Math.abs(odds) / (Math.abs(odds) + 100) : 100 / (odds + 100));

const probabilityToAmerican = (probability) => {
  const safe = clamp(probability, 0.08, 0.92);
  return safe >= 0.5 ? -Math.round((safe / (1 - safe)) * 100) : Math.round(((1 - safe) / safe) * 100);
};

const allGames = (groups) => Object.values(groups).flat();

const formatGameDate = (dateValue) =>
  new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(new Date(dateValue));

const formatGameTime = (dateValue) =>
  new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(dateValue));

const formatRelativeLabel = (dateValue) => {
  const distance = daysUntil(dateValue);
  if (distance <= 0) return "Today";
  if (distance === 1) return "Tomorrow";
  return `In ${distance} days`;
};

const isResolvedGame = (game) => game.status === "final";

const isBettableGame = (game) => {
  const distance = daysUntil(game.startsAt);
  return !game.bettingLocked && !isResolvedGame(game) && distance >= 0 && distance <= BETTING_WINDOW_DAYS;
};

const buildTeamLookup = () => {
  const lookup = {};
  Object.values(TEAM_LIBRARY)
    .flat()
    .forEach((team) => {
      lookup[team.name] = team;
    });
  return lookup;
};

const TEAM_LOOKUP = buildTeamLookup();

function buildSyntheticScore(sport, team, opponent, seed) {
  if (sport === "nba") {
    const scored = Math.round(94 + team.attack * 0.32 - opponent.defense * 0.14 + seededNumber(`${seed}-for`, -8, 11));
    const allowed = Math.round(94 + opponent.attack * 0.31 - team.defense * 0.13 + seededNumber(`${seed}-against`, -9, 10));
    return scored === allowed ? { scored: scored + 3, allowed } : { scored, allowed };
  }

  if (sport === "nhl") {
    let scored = Math.round(2.6 + (team.attack - opponent.defense) / 18 + seededNumber(`${seed}-for`, -1.1, 1.4));
    let allowed = Math.round(2.6 + (opponent.attack - team.defense) / 18 + seededNumber(`${seed}-against`, -1.1, 1.3));
    scored = clamp(scored, 1, 6);
    allowed = clamp(allowed, 1, 6);
    if (scored === allowed) scored += 1;
    return { scored, allowed };
  }

  let scored = Math.round(3.8 + (team.attack - opponent.defense) / 18 + seededNumber(`${seed}-for`, -1.8, 2.2));
  let allowed = Math.round(3.8 + (opponent.attack - team.defense) / 18 + seededNumber(`${seed}-against`, -1.7, 2.1));
  scored = clamp(scored, 1, 10);
  allowed = clamp(allowed, 1, 10);
  if (scored === allowed) scored += 1;
  return { scored, allowed };
}

function buildSyntheticHistory() {
  const history = {};

  Object.entries(TEAM_LIBRARY).forEach(([sport, teams]) => {
    teams.forEach((team, teamIndex) => {
      const entries = [];

      for (let gameIndex = 0; gameIndex < 12; gameIndex += 1) {
        const opponent = teams[(teamIndex + gameIndex + 3) % teams.length];
        const venue = gameIndex % 2 === 0 ? "Home" : "Away";
        const seed = `${sport}-${team.code}-${gameIndex}`;
        const score = buildSyntheticScore(sport, team, opponent, seed);
        const result = score.scored > score.allowed ? "W" : "L";

        entries.push({
          id: `${team.code}-${gameIndex}`,
          sport,
          date: addDays(new Date(), -(gameIndex + 1) * 3).toISOString(),
          opponent: opponent.name,
          venue,
          result,
          scored: score.scored,
          allowed: score.allowed,
          note: HISTORY_NOTES[sport][gameIndex % HISTORY_NOTES[sport].length],
        });
      }

      history[team.name] = entries.sort((left, right) => new Date(right.date) - new Date(left.date));
    });
  });

  return history;
}

const TEAM_HISTORY = buildSyntheticHistory();

function buildTeamSummaries() {
  const summaries = {};

  Object.entries(TEAM_HISTORY).forEach(([teamName, entries]) => {
    const recent = entries.slice(0, 5);
    const wins = recent.filter((entry) => entry.result === "W").length;
    const avgFor = (recent.reduce((total, entry) => total + entry.scored, 0) / recent.length).toFixed(1);
    const avgAgainst = (recent.reduce((total, entry) => total + entry.allowed, 0) / recent.length).toFixed(1);
    const latestTrend = recent[0]?.result || "W";

    let streakCount = 0;
    for (const entry of entries) {
      if (entry.result !== latestTrend) break;
      streakCount += 1;
    }

    const closeThreshold = recent[0]?.sport === "nba" ? 7 : recent[0]?.sport === "nhl" ? 1 : 2;
    const closeGames = recent.filter((entry) => Math.abs(entry.scored - entry.allowed) <= closeThreshold).length;

    summaries[teamName] = {
      recordLastFive: `${wins}-${5 - wins}`,
      avgFor,
      avgAgainst,
      streak: `${latestTrend}${streakCount}`,
      closeGames,
      recent,
    };
  });

  return summaries;
}

const TEAM_SUMMARIES = buildTeamSummaries();

function buildLiveSnapshot(sport, seed) {
  if (sport === "nba") {
    return {
      score: {
        home: Math.round(seededNumber(`${seed}-home`, 54, 96)),
        away: Math.round(seededNumber(`${seed}-away`, 50, 92)),
      },
      clock: ["Q2 6:40", "Q3 9:12", "Q4 3:51"][Math.floor(seededNumber(`${seed}-clock`, 0, 3))],
    };
  }

  if (sport === "nhl") {
    return {
      score: {
        home: Math.round(seededNumber(`${seed}-home`, 1, 4)),
        away: Math.round(seededNumber(`${seed}-away`, 1, 4)),
      },
      clock: ["P2 12:20", "P3 8:14", "P3 3:18"][Math.floor(seededNumber(`${seed}-clock`, 0, 3))],
    };
  }

  return {
    score: {
      home: Math.round(seededNumber(`${seed}-home`, 1, 7)),
      away: Math.round(seededNumber(`${seed}-away`, 1, 7)),
    },
    clock: ["Top 5th", "Bot 7th", "Top 8th"][Math.floor(seededNumber(`${seed}-clock`, 0, 3))],
  };
}

function buildTotalLine(sport, seed) {
  if (sport === "nba") return Number(seededNumber(`${seed}-ou`, 211, 232).toFixed(1));
  if (sport === "nhl") return Number(seededNumber(`${seed}-ou`, 5.0, 6.8).toFixed(1));
  return Number(seededNumber(`${seed}-ou`, 7.2, 9.7).toFixed(1));
}

function generateGames() {
  const makeGame = ({ id, sport, home, away, startsAt, status = "upcoming", homeOdds, awayOdds, ou, storyline, featured = false, score = null, clock = null, outcomeTeam = null, bettingLocked = false }) => {
    const homeMeta = TEAM_LOOKUP[home];
    const awayMeta = TEAM_LOOKUP[away];
    const seed = `${id}-${homeMeta.code}-${awayMeta.code}`;
    const homeProbability =
      homeOdds !== undefined
        ? americanToProbability(homeOdds)
        : clamp(0.5 + ((homeMeta.attack + homeMeta.defense) - (awayMeta.attack + awayMeta.defense) + 4) / 220, 0.35, 0.65);
    const finalHomeOdds = homeOdds ?? probabilityToAmerican(homeProbability);
    const finalAwayOdds = awayOdds ?? probabilityToAmerican(1 - homeProbability);
    const liveSnapshot = status === "live" && !score ? buildLiveSnapshot(sport, seed) : null;

    return {
      id,
      sport,
      home,
      away,
      startsAt,
      status,
      score: score || liveSnapshot?.score || null,
      clock: clock || liveSnapshot?.clock || null,
      homeOdds: finalHomeOdds,
      awayOdds: finalAwayOdds,
      ou: ou ?? buildTotalLine(sport, seed),
      storyline,
      featured,
      outcomeTeam,
      bettingLocked,
    };
  };

  return {
    nba: [
      makeGame({ id: "nba-phx-okc-g4", sport: "nba", away: "Phoenix Suns", home: "Oklahoma City Thunder", startsAt: "2026-04-29T20:30:00-05:00", status: "final", score: { away: 101, home: 118 }, outcomeTeam: "Oklahoma City Thunder", awayOdds: 185, homeOdds: -220, ou: 226.5, storyline: "The Suns have been eliminated from playoffs." }),
      makeGame({ id: "nba-bos-phi-g7", sport: "nba", away: "Boston Celtics", home: "Philadelphia 76ers", startsAt: "2026-05-03T18:30:00-05:00", status: "final", score: { away: 104, home: 111 }, outcomeTeam: "Philadelphia 76ers", awayOdds: -105, homeOdds: -115, ou: 216.5, storyline: "The Celtics have been eliminated from the playoffs." }),
      makeGame({ id: "nba-lal-okc-g1", sport: "nba", away: "Los Angeles Lakers", home: "Oklahoma City Thunder", startsAt: "2026-05-04T19:30:00-05:00", status: "live", score: { away: 61, home: 66 }, clock: "Q3 7:42", awayOdds: 155, homeOdds: -180, ou: 224.5, storyline: "Western Conference Semifinals Game 1", featured: true }),
      makeGame({ id: "nba-min-sas-g1", sport: "nba", away: "Minnesota Timberwolves", home: "San Antonio Spurs", startsAt: "2026-05-04T20:30:00-05:00", status: "live", score: { away: 48, home: 52 }, clock: "Q2 3:18", awayOdds: 125, homeOdds: -145, ou: 221.5, storyline: "Western Conference Semifinals Game 1" }),
      makeGame({ id: "nba-phi-nyk-g1", sport: "nba", away: "Philadelphia 76ers", home: "New York Knicks", startsAt: "2026-05-05T18:00:00-05:00", awayOdds: 120, homeOdds: -140, ou: 216.5, storyline: "Eastern Conference Semifinals Game 1" }),
      makeGame({ id: "nba-det-cle-g1", sport: "nba", away: "Detroit Pistons", home: "Cleveland Cavaliers", startsAt: "2026-05-05T19:30:00-05:00", awayOdds: 135, homeOdds: -160, ou: 214.5, storyline: "Eastern Conference Semifinals Game 1" }),
      makeGame({ id: "nba-lal-okc-g2", sport: "nba", away: "Los Angeles Lakers", home: "Oklahoma City Thunder", startsAt: "2026-05-06T20:30:00-05:00", awayOdds: 150, homeOdds: -175, ou: 225.5, storyline: "Thunder host Game 2 in Oklahoma City" }),
      makeGame({ id: "nba-min-sas-g2", sport: "nba", away: "Minnesota Timberwolves", home: "San Antonio Spurs", startsAt: "2026-05-06T19:00:00-05:00", awayOdds: 120, homeOdds: -140, ou: 220.5, storyline: "Spurs try to protect home court in Game 2" }),
      makeGame({ id: "nba-nyk-phi-g2", sport: "nba", away: "New York Knicks", home: "Philadelphia 76ers", startsAt: "2026-05-07T18:30:00-05:00", awayOdds: 105, homeOdds: -125, ou: 217.5, storyline: "Game 2 shifts pressure onto the road side" }),
      makeGame({ id: "nba-cle-det-g2", sport: "nba", away: "Cleveland Cavaliers", home: "Detroit Pistons", startsAt: "2026-05-07T20:00:00-05:00", awayOdds: -115, homeOdds: -105, ou: 215.5, storyline: "Pistons host a second-round playoff game" }),
      makeGame({ id: "nba-okc-lal-g3", sport: "nba", away: "Oklahoma City Thunder", home: "Los Angeles Lakers", startsAt: "2026-05-08T19:30:00-05:00", awayOdds: -145, homeOdds: 125, ou: 224.5, storyline: "Game 3 shifts to Los Angeles; betting opens after Game 2", bettingLocked: true }),
      makeGame({ id: "nba-sas-min-g3", sport: "nba", away: "San Antonio Spurs", home: "Minnesota Timberwolves", startsAt: "2026-05-08T20:30:00-05:00", awayOdds: 105, homeOdds: -125, ou: 221.5, storyline: "Timberwolves host Game 3; betting opens after Game 2", bettingLocked: true }),
      makeGame({ id: "nba-phi-nyk-g3", sport: "nba", away: "Philadelphia 76ers", home: "New York Knicks", startsAt: "2026-05-09T18:00:00-05:00", awayOdds: 115, homeOdds: -135, ou: 216.5, storyline: "Knicks home crowd gets Game 3; betting opens after Game 2", bettingLocked: true }),
      makeGame({ id: "nba-det-cle-g3", sport: "nba", away: "Detroit Pistons", home: "Cleveland Cavaliers", startsAt: "2026-05-09T19:30:00-05:00", awayOdds: 145, homeOdds: -170, ou: 214.5, storyline: "Cavaliers host Game 3; betting opens after Game 2", bettingLocked: true }),
      makeGame({ id: "nba-okc-lal-g4", sport: "nba", away: "Oklahoma City Thunder", home: "Los Angeles Lakers", startsAt: "2026-05-10T18:30:00-05:00", awayOdds: -140, homeOdds: 120, ou: 225.5, storyline: "Game 4 stays visible but is locked until closer to tip", bettingLocked: true }),
      makeGame({ id: "nba-sas-min-g4", sport: "nba", away: "San Antonio Spurs", home: "Minnesota Timberwolves", startsAt: "2026-05-10T20:00:00-05:00", awayOdds: 110, homeOdds: -130, ou: 220.5, storyline: "Game 4 stays visible but is locked until closer to tip", bettingLocked: true }),
      makeGame({ id: "nba-nyk-phi-g4", sport: "nba", away: "New York Knicks", home: "Philadelphia 76ers", startsAt: "2026-05-11T18:30:00-05:00", awayOdds: 105, homeOdds: -125, ou: 217.5, storyline: "Game 4 stays visible but is locked until closer to tip", bettingLocked: true }),
      makeGame({ id: "nba-cle-det-g4", sport: "nba", away: "Cleveland Cavaliers", home: "Detroit Pistons", startsAt: "2026-05-11T20:00:00-05:00", awayOdds: -115, homeOdds: -105, ou: 215.5, storyline: "Game 4 stays visible but is locked until closer to tip", bettingLocked: true }),
    ],
    nhl: [
      makeGame({ id: "nhl-ott-car-g4", sport: "nhl", away: "Ottawa Senators", home: "Carolina Hurricanes", startsAt: "2026-04-26T17:00:00-05:00", status: "final", score: { away: 2, home: 4 }, outcomeTeam: "Carolina Hurricanes", awayOdds: 185, homeOdds: -220, ou: 5.5, storyline: "Carolina completed the sweep" }),
      makeGame({ id: "nhl-lak-col-g4", sport: "nhl", away: "Los Angeles Kings", home: "Colorado Avalanche", startsAt: "2026-04-26T20:30:00-05:00", status: "final", score: { away: 1, home: 5 }, outcomeTeam: "Colorado Avalanche", awayOdds: 170, homeOdds: -200, ou: 5.5, storyline: "Colorado advanced with a sweep" }),
      makeGame({ id: "nhl-bos-buf-g6", sport: "nhl", away: "Boston Bruins", home: "Buffalo Sabres", startsAt: "2026-05-01T18:30:00-05:00", status: "final", score: { away: 1, home: 4 }, outcomeTeam: "Buffalo Sabres", awayOdds: 145, homeOdds: -170, ou: 5.5, storyline: "Buffalo eliminated Boston in six games" }),
      makeGame({ id: "nhl-phi-car-g1", sport: "nhl", away: "Philadelphia Flyers", home: "Carolina Hurricanes", startsAt: "2026-05-03T18:00:00-05:00", status: "final", score: { away: 2, home: 4 }, outcomeTeam: "Carolina Hurricanes", awayOdds: 155, homeOdds: -180, ou: 5.5, storyline: "Hurricanes took Game 1 at home" }),
      makeGame({ id: "nhl-phi-car-g2", sport: "nhl", away: "Philadelphia Flyers", home: "Carolina Hurricanes", startsAt: "2026-05-04T18:00:00-05:00", status: "live", score: { away: 1, home: 2 }, clock: "P2 8:14", awayOdds: 155, homeOdds: -180, ou: 5.5, storyline: "Carolina leads the second-round series 1-0", featured: true }),
      makeGame({ id: "nhl-ana-vgk-g1", sport: "nhl", away: "Anaheim Ducks", home: "Vegas Golden Knights", startsAt: "2026-05-04T20:30:00-05:00", status: "live", score: { away: 2, home: 2 }, clock: "P3 12:20", awayOdds: 140, homeOdds: -165, ou: 6.0, storyline: "Western Conference Second Round Game 1" }),
      makeGame({ id: "nhl-min-col-g1", sport: "nhl", away: "Minnesota Wild", home: "Colorado Avalanche", startsAt: "2026-05-04T21:00:00-05:00", status: "live", score: { away: 1, home: 3 }, clock: "P2 4:46", awayOdds: 150, homeOdds: -175, ou: 5.5, storyline: "Avalanche open the second round at home" }),
      makeGame({ id: "nhl-ana-vgk-g2", sport: "nhl", away: "Anaheim Ducks", home: "Vegas Golden Knights", startsAt: "2026-05-05T20:30:00-05:00", awayOdds: 145, homeOdds: -170, ou: 6.0, storyline: "Golden Knights host Game 2" }),
      makeGame({ id: "nhl-min-col-g2", sport: "nhl", away: "Minnesota Wild", home: "Colorado Avalanche", startsAt: "2026-05-05T20:30:00-05:00", awayOdds: 150, homeOdds: -175, ou: 5.5, storyline: "Wild and Avalanche continue their second-round series" }),
      makeGame({ id: "nhl-mtl-buf-g1", sport: "nhl", away: "Montreal Canadiens", home: "Buffalo Sabres", startsAt: "2026-05-06T18:00:00-05:00", awayOdds: 135, homeOdds: -160, ou: 5.5, storyline: "Eastern Conference Second Round Game 1 in Buffalo" }),
      makeGame({ id: "nhl-mtl-buf-g2", sport: "nhl", away: "Montreal Canadiens", home: "Buffalo Sabres", startsAt: "2026-05-06T20:00:00-05:00", awayOdds: 140, homeOdds: -165, ou: 5.5, storyline: "Sabres host Game 2" }),
      makeGame({ id: "nhl-car-phi-g3", sport: "nhl", away: "Carolina Hurricanes", home: "Philadelphia Flyers", startsAt: "2026-05-07T18:30:00-05:00", awayOdds: -135, homeOdds: 115, ou: 5.5, storyline: "The series shifts to Philadelphia for Game 3; betting opens after Game 2", bettingLocked: true }),
      makeGame({ id: "nhl-col-min-g3", sport: "nhl", away: "Colorado Avalanche", home: "Minnesota Wild", startsAt: "2026-05-07T20:30:00-05:00", awayOdds: -145, homeOdds: 125, ou: 5.5, storyline: "Wild host Game 3; betting opens after Game 2", bettingLocked: true }),
      makeGame({ id: "nhl-vgk-ana-g3", sport: "nhl", away: "Vegas Golden Knights", home: "Anaheim Ducks", startsAt: "2026-05-08T20:30:00-05:00", awayOdds: -120, homeOdds: 100, ou: 6.0, storyline: "Ducks host Game 3; betting opens after Game 2", bettingLocked: true }),
      makeGame({ id: "nhl-buf-mtl-g3", sport: "nhl", away: "Buffalo Sabres", home: "Montreal Canadiens", startsAt: "2026-05-08T18:00:00-05:00", awayOdds: -125, homeOdds: 105, ou: 5.5, storyline: "Canadiens host Game 3; betting opens after Game 2", bettingLocked: true }),
      makeGame({ id: "nhl-car-phi-g4", sport: "nhl", away: "Carolina Hurricanes", home: "Philadelphia Flyers", startsAt: "2026-05-09T18:30:00-05:00", awayOdds: -130, homeOdds: 110, ou: 5.5, storyline: "Flyers host Game 4, locked until closer to puck drop", bettingLocked: true }),
      makeGame({ id: "nhl-col-min-g4", sport: "nhl", away: "Colorado Avalanche", home: "Minnesota Wild", startsAt: "2026-05-09T20:30:00-05:00", awayOdds: -140, homeOdds: 120, ou: 5.5, storyline: "Wild host Game 4, locked until closer to puck drop", bettingLocked: true }),
      makeGame({ id: "nhl-vgk-ana-g4", sport: "nhl", away: "Vegas Golden Knights", home: "Anaheim Ducks", startsAt: "2026-05-10T20:30:00-05:00", awayOdds: -125, homeOdds: 105, ou: 6.0, storyline: "Ducks host Game 4, locked until closer to puck drop", bettingLocked: true }),
      makeGame({ id: "nhl-buf-mtl-g4", sport: "nhl", away: "Buffalo Sabres", home: "Montreal Canadiens", startsAt: "2026-05-10T18:00:00-05:00", awayOdds: -120, homeOdds: 100, ou: 5.5, storyline: "Canadiens host Game 4, locked until closer to puck drop", bettingLocked: true }),
    ],
    mlb: [
      makeGame({ id: "mlb-mia-sf-426", sport: "mlb", away: "Miami Marlins", home: "San Francisco Giants", startsAt: "2026-04-26T15:05:00-05:00", status: "final", score: { away: 3, home: 5 }, outcomeTeam: "San Francisco Giants", awayOdds: 135, homeOdds: -155, ou: 8.0, storyline: "Past MLB market already settled" }),
      makeGame({ id: "mlb-chc-lad-426", sport: "mlb", away: "Chicago Cubs", home: "Los Angeles Dodgers", startsAt: "2026-04-26T15:10:00-05:00", status: "final", score: { away: 4, home: 6 }, outcomeTeam: "Los Angeles Dodgers", awayOdds: 150, homeOdds: -175, ou: 8.5, storyline: "Dodgers home market is resolved" }),
      makeGame({ id: "mlb-tb-cle-427", sport: "mlb", away: "Tampa Bay Rays", home: "Cleveland Guardians", startsAt: "2026-04-27T17:10:00-05:00", status: "final", score: { away: 2, home: 1 }, outcomeTeam: "Tampa Bay Rays", awayOdds: 105, homeOdds: -125, ou: 8.0, storyline: "Resolved Rays/Guardians market", featured: true }),
      makeGame({ id: "mlb-bos-tor-427", sport: "mlb", away: "Boston Red Sox", home: "Toronto Blue Jays", startsAt: "2026-04-27T18:07:00-05:00", status: "final", score: { away: 1, home: 3 }, outcomeTeam: "Toronto Blue Jays", awayOdds: 115, homeOdds: -135, ou: 8.5, storyline: "Resolved Blue Jays home market" }),
      makeGame({ id: "mlb-nyy-tex-427", sport: "mlb", away: "New York Yankees", home: "Texas Rangers", startsAt: "2026-04-27T19:05:00-05:00", status: "final", score: { away: 5, home: 4 }, outcomeTeam: "New York Yankees", awayOdds: -115, homeOdds: -105, ou: 8.5, storyline: "Yankees past market is resolved" }),
      makeGame({ id: "mlb-chc-sd-427", sport: "mlb", away: "Chicago Cubs", home: "San Diego Padres", startsAt: "2026-04-27T20:40:00-05:00", status: "final", score: { away: 3, home: 6 }, outcomeTeam: "San Diego Padres", awayOdds: 110, homeOdds: -130, ou: 8.0, storyline: "Padres past market is resolved" }),
      makeGame({ id: "mlb-mia-lad-427", sport: "mlb", away: "Miami Marlins", home: "Los Angeles Dodgers", startsAt: "2026-04-27T21:10:00-05:00", status: "final", score: { away: 2, home: 8 }, outcomeTeam: "Los Angeles Dodgers", awayOdds: 210, homeOdds: -255, ou: 8.5, storyline: "Dodgers past market is resolved" }),
      makeGame({ id: "mlb-hou-bal-428", sport: "mlb", away: "Houston Astros", home: "Baltimore Orioles", startsAt: "2026-04-28T17:35:00-05:00", status: "final", score: { away: 4, home: 5 }, outcomeTeam: "Baltimore Orioles", awayOdds: -105, homeOdds: -115, ou: 8.5, storyline: "Orioles/Astros past market is resolved" }),
      makeGame({ id: "mlb-sf-phi-428", sport: "mlb", away: "San Francisco Giants", home: "Philadelphia Phillies", startsAt: "2026-04-28T17:40:00-05:00", status: "final", score: { away: 3, home: 7 }, outcomeTeam: "Philadelphia Phillies", awayOdds: 120, homeOdds: -140, ou: 8.0, storyline: "Phillies past market is resolved" }),
      makeGame({ id: "mlb-sea-min-428", sport: "mlb", away: "Seattle Mariners", home: "Minnesota Twins", startsAt: "2026-04-28T18:40:00-05:00", status: "final", score: { away: 4, home: 2 }, outcomeTeam: "Seattle Mariners", awayOdds: -110, homeOdds: -110, ou: 7.5, storyline: "Mariners past market is resolved" }),
      makeGame({ id: "mlb-atl-sea-501", sport: "mlb", away: "Atlanta Braves", home: "Seattle Mariners", startsAt: "2026-05-01T20:40:00-05:00", status: "final", score: { away: 6, home: 4 }, outcomeTeam: "Atlanta Braves", awayOdds: -115, homeOdds: -105, ou: 8.0, storyline: "Braves past market is resolved" }),
      makeGame({ id: "mlb-bal-nyy-504", sport: "mlb", away: "Baltimore Orioles", home: "New York Yankees", startsAt: "2026-05-04T18:05:00-05:00", status: "live", score: { away: 2, home: 4 }, clock: "Bot 5th", awayOdds: 135, homeOdds: -155, ou: 8.5, storyline: "Yankees host the Orioles on Monday" }),
      makeGame({ id: "mlb-lad-hou-504", sport: "mlb", away: "Los Angeles Dodgers", home: "Houston Astros", startsAt: "2026-05-04T19:10:00-05:00", status: "live", score: { away: 5, home: 3 }, clock: "Top 7th", awayOdds: -135, homeOdds: 115, ou: 8.5, storyline: "Astros host the Dodgers in Houston" }),
      makeGame({ id: "mlb-atl-sea-504", sport: "mlb", away: "Atlanta Braves", home: "Seattle Mariners", startsAt: "2026-05-04T20:40:00-05:00", status: "live", score: { away: 3, home: 2 }, clock: "Top 6th", awayOdds: -105, homeOdds: -115, ou: 7.5, storyline: "Braves visit Seattle on Monday" }),
      makeGame({ id: "mlb-tex-nyy-505", sport: "mlb", away: "Texas Rangers", home: "New York Yankees", startsAt: "2026-05-05T18:05:00-05:00", awayOdds: 120, homeOdds: -140, ou: 8.5, storyline: "Yankees begin a series with Texas" }),
      makeGame({ id: "mlb-lad-hou-505", sport: "mlb", away: "Los Angeles Dodgers", home: "Houston Astros", startsAt: "2026-05-05T19:10:00-05:00", awayOdds: -130, homeOdds: 110, ou: 8.0, storyline: "Dodgers and Astros continue the set" }),
      makeGame({ id: "mlb-sd-bal-505", sport: "mlb", away: "San Diego Padres", home: "Baltimore Orioles", startsAt: "2026-05-05T18:35:00-05:00", awayOdds: -105, homeOdds: -115, ou: 8.0, storyline: "Padres/Orioles matchup for the live board" }),
      makeGame({ id: "mlb-atl-sea-505", sport: "mlb", away: "Atlanta Braves", home: "Seattle Mariners", startsAt: "2026-05-05T20:40:00-05:00", awayOdds: -110, homeOdds: -110, ou: 7.5, storyline: "Braves continue the Mariners series" }),
      makeGame({ id: "mlb-hou-bal-506", sport: "mlb", away: "Houston Astros", home: "Baltimore Orioles", startsAt: "2026-05-06T17:35:00-05:00", awayOdds: -105, homeOdds: -115, ou: 8.5, storyline: "Astros and Orioles continue the series" }),
      makeGame({ id: "mlb-nyy-tb-506", sport: "mlb", away: "New York Yankees", home: "Tampa Bay Rays", startsAt: "2026-05-06T17:50:00-05:00", awayOdds: -125, homeOdds: 105, ou: 8.0, storyline: "Yankees visit Tampa Bay" }),
      makeGame({ id: "mlb-chc-phi-506", sport: "mlb", away: "Chicago Cubs", home: "Philadelphia Phillies", startsAt: "2026-05-06T18:40:00-05:00", awayOdds: 115, homeOdds: -135, ou: 8.0, storyline: "Cubs visit the Phillies for a featured slate matchup" }),
      makeGame({ id: "mlb-atl-sea-506", sport: "mlb", away: "Atlanta Braves", home: "Seattle Mariners", startsAt: "2026-05-06T15:10:00-05:00", awayOdds: -125, homeOdds: 105, ou: 8.0, storyline: "Braves wrap the Seattle series" }),
      makeGame({ id: "mlb-sd-atl-507", sport: "mlb", away: "San Diego Padres", home: "Atlanta Braves", startsAt: "2026-05-07T18:20:00-05:00", awayOdds: 125, homeOdds: -145, ou: 8.5, storyline: "Padres visit the Braves" }),
      makeGame({ id: "mlb-sea-bos-507", sport: "mlb", away: "Seattle Mariners", home: "Boston Red Sox", startsAt: "2026-05-07T18:10:00-05:00", awayOdds: -105, homeOdds: -115, ou: 8.5, storyline: "Mariners and Red Sox on the expanded board" }),
      makeGame({ id: "mlb-phi-chc-507", sport: "mlb", away: "Philadelphia Phillies", home: "Chicago Cubs", startsAt: "2026-05-07T19:05:00-05:00", awayOdds: -120, homeOdds: 100, ou: 8.0, storyline: "Phillies/Cubs return matchup" }),
      makeGame({ id: "mlb-phi-sd-508", sport: "mlb", away: "Philadelphia Phillies", home: "San Diego Padres", startsAt: "2026-05-08T20:40:00-05:00", awayOdds: 105, homeOdds: -125, ou: 8.0, storyline: "Padres host the Phillies later in the week" }),
      makeGame({ id: "mlb-chc-nyy-508", sport: "mlb", away: "Chicago Cubs", home: "New York Yankees", startsAt: "2026-05-08T18:05:00-05:00", awayOdds: 145, homeOdds: -170, ou: 8.5, storyline: "Cubs/Yankees presentation matchup" }),
      makeGame({ id: "mlb-atl-lad-508", sport: "mlb", away: "Atlanta Braves", home: "Los Angeles Dodgers", startsAt: "2026-05-08T21:10:00-05:00", awayOdds: 135, homeOdds: -155, ou: 8.5, storyline: "Braves open a road series at Dodger Stadium" }),
      makeGame({ id: "mlb-lad-sf-509", sport: "mlb", away: "Los Angeles Dodgers", home: "San Francisco Giants", startsAt: "2026-05-09T20:05:00-05:00", awayOdds: -150, homeOdds: 130, ou: 8.0, storyline: "Dodgers/Giants rivalry game visible for scouting", bettingLocked: true }),
      makeGame({ id: "mlb-tor-tex-509", sport: "mlb", away: "Toronto Blue Jays", home: "Texas Rangers", startsAt: "2026-05-09T19:05:00-05:00", awayOdds: 115, homeOdds: -135, ou: 8.5, storyline: "Blue Jays visit Texas, locked until the 3-day window", bettingLocked: true }),
      makeGame({ id: "mlb-cle-min-509", sport: "mlb", away: "Cleveland Guardians", home: "Minnesota Twins", startsAt: "2026-05-09T18:40:00-05:00", awayOdds: 105, homeOdds: -125, ou: 7.5, storyline: "Guardians/Twins scout-only matchup for later in the week", bettingLocked: true }),
    ],
  };
}

function createInitialMarkets(groups) {
  const markets = {};

  allGames(groups).forEach((game) => {
    const baseline = clamp(americanToProbability(game.homeOdds), 0.18, 0.82);
    const finalPrice = game.outcomeTeam ? (game.outcomeTeam === game.home ? 0.99 : 0.01) : null;
    const priceHistory = Array.from({ length: 24 }, (_, index) => {
      const movement = Math.sin(index / 3 + seededNumber(`${game.id}-phase`, 0, 3)) * 0.018;
      const liveLift = game.status === "live" ? index * 0.0012 : 0;
      const resolvedDrift = finalPrice === null ? 0 : (finalPrice - baseline) * (index / 23);
      const price = clamp(baseline + movement + liveLift + resolvedDrift, 0.01, 0.99);
      return { t: index, p: Number(price.toFixed(2)) };
    });

    markets[game.id] = {
      price: isResolvedGame(game) && finalPrice !== null ? finalPrice : priceHistory[priceHistory.length - 1].p,
      priceHistory,
      tick: priceHistory[priceHistory.length - 1].t,
      resolveAt: null,
      outcomeTeam: game.outcomeTeam || null,
      resolvedAt: isResolvedGame(game) ? new Date(game.startsAt).getTime() + 3 * 60 * 60 * 1000 : null,
    };
  });

  return markets;
}

function genCommunityMsg(groups) {
  const pool = allGames(groups).filter((game) => game.status === "live" || isBettableGame(game));
  if (!pool.length) return null;

  const game = pool[Math.floor(Math.random() * pool.length)];
  const user = COMMUNITY_USERS[Math.floor(Math.random() * COMMUNITY_USERS.length)];
  const amount = [40, 60, 100, 150, 220, 350][Math.floor(Math.random() * 6)];
  const team = Math.random() > 0.5 ? game.home : game.away;
  const teamMeta = TEAM_LOOKUP[team];

  const messages = [
    `${user} grabbed ${teamMeta.short} ${formatOdds(team === game.home ? game.homeOdds : game.awayOdds)} for ${amount} pts`,
    `${user} checked the ${teamMeta.short} trend board`,
    `${user} stacked ${TEAM_LOOKUP[game.away].short}/${TEAM_LOOKUP[game.home].short} into a parlay slip`,
    `${user} liked the projected total at ${game.ou}`,
    `${user} watched the single-game chart flip toward ${teamMeta.short}`,
  ];

  return messages[Math.floor(Math.random() * messages.length)];
}

function getMentionedTeams(question, fallbackGame) {
  const lower = question.toLowerCase();
  const found = Object.values(TEAM_LOOKUP).filter((team) => {
    return (
      lower.includes(team.name.toLowerCase()) ||
      lower.includes(team.short.toLowerCase()) ||
      lower.includes(team.code.toLowerCase())
    );
  });

  if (found.length) return found.map((team) => team.name);
  return fallbackGame ? [fallbackGame.home, fallbackGame.away] : [];
}

function buildOpeningScoutMessage(game, market) {
  const homeSummary = TEAM_SUMMARIES[game.home];
  const awaySummary = TEAM_SUMMARIES[game.away];
  const lean = market && market.price >= 0.5 ? TEAM_LOOKUP[game.home].short : TEAM_LOOKUP[game.away].short;

  return `${lean} carry the current model edge. ${TEAM_LOOKUP[game.home].short} are ${homeSummary.recordLastFive} over their last five tracked games, while ${TEAM_LOOKUP[game.away].short} are ${awaySummary.recordLastFive}. Ask about form, scoring trends, late-game profile, or a betting lean.`;
}

function buildScoutReply(question, game, market) {
  const mentionedTeams = getMentionedTeams(question, game);
  const homeTeam = TEAM_LOOKUP[game.home];
  const awayTeam = TEAM_LOOKUP[game.away];
  const homeSummary = TEAM_SUMMARIES[game.home];
  const awaySummary = TEAM_SUMMARIES[game.away];
  const lower = question.toLowerCase();

  const buildTeamDetail = (teamName) => {
    const meta = TEAM_LOOKUP[teamName];
    const summary = TEAM_SUMMARIES[teamName];
    const recentRun = summary.recent
      .slice(0, 3)
      .map((entry) => `${entry.result} vs ${TEAM_LOOKUP[entry.opponent].short} (${entry.scored}-${entry.allowed})`)
      .join(", ");

    return `${meta.short} are ${summary.recordLastFive} in their last five tracked games with ${summary.avgFor} scored and ${summary.avgAgainst} allowed. Recent sample: ${recentRun}.`;
  };

  if (
    lower.includes("compare") ||
    lower.includes("edge") ||
    lower.includes("who wins") ||
    lower.includes("pick") ||
    lower.includes("bet")
  ) {
    const leanHome = market?.price ?? americanToProbability(game.homeOdds);
    const favorite = leanHome >= 0.5 ? homeTeam.short : awayTeam.short;
    const underdog = leanHome >= 0.5 ? awayTeam.short : homeTeam.short;
    const paceTeam = homeSummary.avgFor >= awaySummary.avgFor ? homeTeam.short : awayTeam.short;
    const steadierTeam = Number(homeSummary.avgAgainst) <= Number(awaySummary.avgAgainst) ? homeTeam.short : awayTeam.short;

    return `${favorite} get the lean because the single-game market still prices them ahead, and their recent form sample has been steadier. ${paceTeam} bring the cleaner scoring form, while ${steadierTeam} have the tighter defensive profile. If you want a safer side, follow the market favorite; if you want volatility, the ${underdog} are the swing play.`;
  }

  if (lower.includes("score") || lower.includes("offense") || lower.includes("shoot")) {
    const teamName = mentionedTeams[0] || game.home;
    const meta = TEAM_LOOKUP[teamName];
    const summary = TEAM_SUMMARIES[teamName];
    return `${meta.short} are averaging ${summary.avgFor} points or runs in their last five tracked games and their style leans toward ${meta.style}. The recent offense has been strongest when they get into ${summary.recent[0]?.note || "repeat actions"} rather than playing slow.`;
  }

  if (lower.includes("defense") || lower.includes("allow") || lower.includes("stop")) {
    const teamName = mentionedTeams[0] || game.away;
    const meta = TEAM_LOOKUP[teamName];
    const summary = TEAM_SUMMARIES[teamName];
    return `${meta.short} are allowing ${summary.avgAgainst} in their recent form sample, and they have ${summary.closeGames} close games in the last five. That points to a defense that keeps games live late even when the offense cools off.`;
  }

  if (lower.includes("late") || lower.includes("clutch") || lower.includes("close")) {
    const homeClose = homeSummary.closeGames;
    const awayClose = awaySummary.closeGames;
    const lateTeam = homeClose >= awayClose ? homeTeam.short : awayTeam.short;
    return `${lateTeam} have lived in tighter finishes lately, so they look more comfortable in a one-possession or one-score script. ${homeTeam.short} are on a ${homeSummary.streak} streak and ${awayTeam.short} are on a ${awaySummary.streak} streak, so momentum is not flat on either side.`;
  }

  if (mentionedTeams.length === 1) {
    return buildTeamDetail(mentionedTeams[0]);
  }

  return `${buildTeamDetail(game.home)} ${buildTeamDetail(game.away)} The current one-chart market is pricing ${market && market.price >= 0.5 ? homeTeam.short : awayTeam.short} as the slight favorite right now.`;
}

function TeamBadge({ team, size = 44 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: size / 2,
        background: `linear-gradient(135deg, ${team.colors[0]}, ${team.colors[1]})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        boxShadow: "0 10px 28px rgba(0,0,0,0.24)",
        color: "#fff",
        fontWeight: 900,
      }}
    >
      <span style={{ fontSize: size * 0.42, filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.3))" }}>{team.icon}</span>
      <span
        style={{
          position: "absolute",
          bottom: -6,
          padding: "2px 5px",
          borderRadius: 999,
          background: "rgba(8,15,26,0.88)",
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: 0.6,
          border: "1px solid rgba(255,255,255,0.14)",
        }}
      >
        {team.code}
      </span>
    </div>
  );
}

function PricePill({ label, value, accent, muted }) {
  return (
    <div
      style={{
        minWidth: 86,
        padding: "7px 10px",
        borderRadius: 12,
        background: muted ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.07)",
        border: `1px solid ${muted ? "rgba(255,255,255,0.06)" : `${accent}44`}`,
      }}
    >
      <div style={{ color: "#8da2bd", fontSize: 10, fontWeight: 700, marginBottom: 2 }}>{label}</div>
      <div style={{ color: accent, fontSize: 15, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function MoneylineMarketChart({ game, market, bet }) {
  if (!market) return null;

  const homeTeam = TEAM_LOOKUP[game.home];
  const awayTeam = TEAM_LOOKUP[game.away];
  const fallbackHomePrice = americanToProbability(game.homeOdds);
  const homePrice = Number.isFinite(market.price) ? market.price : fallbackHomePrice;
  const visible = (market.priceHistory?.length ? market.priceHistory : [{ t: market.tick || 0, p: homePrice }]).slice(-48);
  const awayPrice = Number((1 - homePrice).toFixed(2));
  const w = 360;
  const h = 140;
  const paddingLeft = 28;
  const paddingRight = 10;
  const paddingTop = 10;
  const paddingBottom = 18;
  const chartWidth = w - paddingLeft - paddingRight;
  const chartHeight = h - paddingTop - paddingBottom;
  const minTick = visible[0]?.t ?? 0;
  const maxTick = visible[visible.length - 1]?.t ?? 1;
  const tickRange = Math.max(maxTick - minTick, 1);
  const toX = (tick) => paddingLeft + ((tick - minTick) / tickRange) * chartWidth;
  const toY = (price) => paddingTop + (1 - price) * chartHeight;
  const path = visible.map((point, index) => `${index === 0 ? "M" : "L"}${toX(point.t).toFixed(1)},${toY(Number.isFinite(point.p) ? point.p : homePrice).toFixed(1)}`).join(" ");
  const area =
    visible.length > 1
      ? `${path} L${toX(visible[visible.length - 1].t).toFixed(1)},${toY(0).toFixed(1)} L${toX(visible[0].t).toFixed(1)},${toY(0).toFixed(1)} Z`
      : "";
  const betX = bet ? toX(bet.entryTick) : null;
  const positionPrice = bet ? (bet.team === game.home ? homePrice : awayPrice) : null;
  const investmentValue = bet && bet.entryPrice ? Math.round((positionPrice / bet.entryPrice) * bet.wager) : null;
  const betEntryPrice = Number.isFinite(bet?.entryPrice) ? bet.entryPrice : positionPrice;
  const pnl = investmentValue !== null ? investmentValue - bet.wager : null;
  const resolvedColor = market.resolvedAt ? (market.outcomeTeam === game.home ? homeTeam.colors[0] : awayTeam.colors[0]) : homeTeam.colors[0];

  return (
    <div
      style={{
        background: "rgba(7,13,24,0.8)",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        padding: 14,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ color: "#f6c56a", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.1 }}>
            Single Matchup Market
          </div>
          <div style={{ color: "#fff4db", fontSize: 16, fontWeight: 800, marginTop: 3 }}>
            {awayTeam.short} at {homeTeam.short}
          </div>
          <div style={{ color: "#8da2bd", fontSize: 11, marginTop: 3 }}>
            One chart for the whole game. Away-side price is the inverse of the home-side line.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <PricePill label={`${awayTeam.short} win`} value={`$${awayPrice.toFixed(2)}`} accent={awayTeam.colors[0]} muted={market.outcomeTeam === game.home} />
          <PricePill label={`${homeTeam.short} win`} value={`$${homePrice.toFixed(2)}`} accent={homeTeam.colors[0]} muted={market.outcomeTeam === game.away} />
        </div>
      </div>

      {bet && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "center",
            marginBottom: 10,
            padding: "8px 10px",
            borderRadius: 12,
            background: "rgba(249, 168, 37, 0.08)",
            border: "1px solid rgba(249, 168, 37, 0.16)",
          }}
        >
          <span style={{ color: "#d6e2f3", fontSize: 11 }}>
            Your {TEAM_LOOKUP[bet.team].short} ticket: <strong style={{ color: "#f6c56a" }}>{bet.wager} pts</strong> at ${betEntryPrice.toFixed(2)}
          </span>
          <span style={{ color: bet.result ? (bet.result === "win" ? "#4ade80" : "#f87171") : pnl >= 0 ? "#4ade80" : "#f87171", fontSize: 11, fontWeight: 800 }}>
            {bet.result === "win" && `Won +${bet.potentialWin}`}
            {bet.result === "loss" && `Lost -${bet.wager}`}
            {!bet.result && investmentValue !== null && `Value ${investmentValue} pts (${pnl >= 0 ? "+" : ""}${pnl})`}
          </span>
        </div>
      )}

      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", display: "block" }}>
        <defs>
          <linearGradient id={`market-fill-${game.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={resolvedColor} stopOpacity="0.28" />
            <stop offset="100%" stopColor={resolvedColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.2, 0.5, 0.8].map((marker) => (
          <g key={marker}>
            <line
              x1={paddingLeft}
              y1={toY(marker)}
              x2={w - paddingRight}
              y2={toY(marker)}
              stroke="rgba(120,140,170,0.22)"
              strokeDasharray={marker === 0.5 ? "4,4" : "2,4"}
            />
            <text x={paddingLeft - 4} y={toY(marker) + 3} fill="#60758d" fontSize={8} textAnchor="end">
              {Math.round(marker * 100)}¢
            </text>
          </g>
        ))}
        {visible.length > 1 && <path d={area} fill={`url(#market-fill-${game.id})`} />}
        {visible.length > 1 && <path d={path} fill="none" stroke={resolvedColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
        {betX !== null && (
          <g>
            <line x1={betX} y1={paddingTop} x2={betX} y2={h - paddingBottom} stroke="#f6c56a" strokeWidth={1} strokeDasharray="3,3" />
            <text x={betX} y={h - 4} fill="#f6c56a" fontSize={8} textAnchor="middle">
              ENTRY
            </text>
          </g>
        )}
        {!market.resolvedAt && visible.length > 0 && (
          <circle cx={toX(visible[visible.length - 1].t)} cy={toY(visible[visible.length - 1].p)} r={3.4} fill={resolvedColor}>
            <animate attributeName="r" values="3.4;5.2;3.4" dur="1.2s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, color: "#8da2bd", fontSize: 10 }}>
        <span>{market.resolvedAt ? `Winner: ${TEAM_LOOKUP[market.outcomeTeam].short}` : "Market live"}</span>
        <span>{market.resolveAt ? "Resolution sequence running" : game.status === "live" ? "Live flow" : "Preview line"}</span>
      </div>
    </div>
  );
}

function SummaryStrip({ game }) {
  const homeSummary = TEAM_SUMMARIES[game.home];
  const awaySummary = TEAM_SUMMARIES[game.away];
  const awayMeta = TEAM_LOOKUP[game.away];
  const homeMeta = TEAM_LOOKUP[game.home];

  const items = [
    { label: `${awayMeta.short} L5`, value: awaySummary.recordLastFive, accent: awayMeta.colors[0] },
    { label: `${homeMeta.short} L5`, value: homeSummary.recordLastFive, accent: homeMeta.colors[0] },
    { label: "Synthetic total", value: game.ou, accent: "#f6c56a" },
    { label: "Storyline", value: game.storyline, accent: "#93c5fd" },
  ];

  return (
    <div className="summary-strip" style={{ display: "grid", gap: 8 }}>
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ color: "#8da2bd", fontSize: 10, fontWeight: 700, marginBottom: 4 }}>{item.label}</div>
          <div style={{ color: item.accent, fontSize: item.label === "Storyline" ? 11 : 15, fontWeight: 800, lineHeight: 1.2 }}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function GameCard({ game, market, bet, onBet, selected, onSelect }) {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [wager, setWager] = useState("");
  const homeTeam = TEAM_LOOKUP[game.home];
  const awayTeam = TEAM_LOOKUP[game.away];
  const resolved = isResolvedGame(game) || Boolean(market?.resolvedAt);
  const betOpen = isBettableGame(game) && !resolved;
  const locked = Boolean(bet);
  const statusLabel = resolved
    ? `RESOLVED · ${formatGameDate(game.startsAt)}`
    : game.status === "live"
      ? `LIVE · ${game.clock}`
      : `${formatRelativeLabel(game.startsAt)} · ${formatGameDate(game.startsAt)} · ${formatGameTime(game.startsAt)}`;
  const helperText = resolved
    ? "Market is resolved already, so no new bets can be placed"
    : game.bettingLocked
      ? "Visible for scouting; betting opens after the earlier games settle"
    : game.status === "live"
      ? "Betting is live"
      : betOpen
        ? "Open for pregame bets"
        : "View-only until the 3-day betting window opens";

  useEffect(() => {
    if (locked) {
      setSelectedTeam(null);
      setWager("");
    }
  }, [locked]);

  return (
    <div
      style={{
        background: selected
          ? "linear-gradient(180deg, rgba(29,39,60,0.98), rgba(14,20,34,0.98))"
          : "linear-gradient(180deg, rgba(22,34,54,0.92), rgba(13,20,34,0.96))",
        borderRadius: 22,
        padding: 18,
        border: selected ? "1px solid rgba(246,197,106,0.6)" : "1px solid rgba(255,255,255,0.08)",
        boxShadow: selected ? "0 22px 50px rgba(0,0,0,0.28)" : "0 14px 30px rgba(0,0,0,0.18)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={{ color: resolved ? "#4ade80" : game.status === "live" ? "#fb7185" : "#9db5cf", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>
            {statusLabel}
          </div>
          <div style={{ color: "#f5f7fb", fontSize: 14, fontWeight: 800, marginTop: 4 }}>
            {awayTeam.short} at {homeTeam.short}
          </div>
          <div style={{ color: "#8da2bd", fontSize: 11, marginTop: 3 }}>{helperText}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span
            style={{
              fontSize: 10,
              color: "#f6c56a",
              background: "rgba(246,197,106,0.08)",
              border: "1px solid rgba(246,197,106,0.2)",
              borderRadius: 999,
              padding: "5px 9px",
              fontWeight: 800,
            }}
          >
            {resolved ? "resolved" : "market data"}
          </span>
          <button
            onClick={onSelect}
            style={{
              background: selected ? "rgba(246,197,106,0.14)" : "rgba(255,255,255,0.04)",
              color: selected ? "#f6c56a" : "#d9e4f5",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 999,
              padding: "6px 10px",
              fontSize: 10,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            AI Scout
          </button>
        </div>
      </div>

      <div className="team-picks" style={{ display: "grid", gap: 16, alignItems: "center", marginBottom: 16 }}>
        <button
          onClick={() => !locked && betOpen && setSelectedTeam(game.away)}
          disabled={locked || !betOpen}
          style={{
            background: selectedTeam === game.away ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
            border: selectedTeam === game.away ? `1px solid ${awayTeam.colors[0]}` : "1px solid rgba(255,255,255,0.08)",
            borderRadius: 18,
            padding: 14,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            cursor: locked || !betOpen ? "default" : "pointer",
          }}
        >
          <TeamBadge team={awayTeam} size={54} />
          <div style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>{awayTeam.short}</div>
          {(game.status === "live" || resolved) && game.score && <div style={{ color: "#dce7f6", fontSize: 26, fontWeight: 900 }}>{game.score.away}</div>}
          <div style={{ color: awayTeam.colors[0], fontSize: 15, fontWeight: 900 }}>{formatOdds(game.awayOdds)}</div>
        </button>

        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#60758d", fontSize: 10, fontWeight: 800, letterSpacing: 1.2, marginBottom: 8 }}>ONE MARKET</div>
          <div style={{ color: "#f6c56a", fontSize: 22, fontWeight: 900 }}>VS</div>
          <div style={{ color: "#60758d", fontSize: 10, marginTop: 8 }}>{SPORT_CONFIG[game.sport].label}</div>
        </div>

        <button
          onClick={() => !locked && betOpen && setSelectedTeam(game.home)}
          disabled={locked || !betOpen}
          style={{
            background: selectedTeam === game.home ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
            border: selectedTeam === game.home ? `1px solid ${homeTeam.colors[0]}` : "1px solid rgba(255,255,255,0.08)",
            borderRadius: 18,
            padding: 14,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            cursor: locked || !betOpen ? "default" : "pointer",
          }}
        >
          <TeamBadge team={homeTeam} size={54} />
          <div style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>{homeTeam.short}</div>
          {(game.status === "live" || resolved) && game.score && <div style={{ color: "#dce7f6", fontSize: 26, fontWeight: 900 }}>{game.score.home}</div>}
          <div style={{ color: homeTeam.colors[0], fontSize: 15, fontWeight: 900 }}>{formatOdds(game.homeOdds)}</div>
        </button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <MoneylineMarketChart game={game} market={market} bet={bet} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <SummaryStrip game={game} />
      </div>

      {selectedTeam && betOpen && !locked && (
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            padding: 12,
            borderRadius: 16,
            background: "rgba(246,197,106,0.06)",
            border: "1px solid rgba(246,197,106,0.16)",
          }}
        >
          <div style={{ color: "#f6c56a", fontSize: 12, fontWeight: 800, minWidth: 98 }}>{TEAM_LOOKUP[selectedTeam].short}</div>
          <input
            type="number"
            min="10"
            placeholder="Wager pts"
            value={wager}
            onChange={(event) => setWager(event.target.value)}
            style={{
              flex: 1,
              minWidth: 0,
              background: "rgba(7,13,24,0.8)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#fff",
              borderRadius: 12,
              padding: "10px 12px",
              fontSize: 13,
              outline: "none",
            }}
          />
          {Number(wager) >= 10 && (
            <div style={{ color: "#4ade80", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>
              +{calcPayout(Number(wager), selectedTeam === game.home ? game.homeOdds : game.awayOdds)}
            </div>
          )}
          <button
            onClick={() => onBet(game, selectedTeam, wager)}
            style={{
              background: "linear-gradient(135deg, #f97316, #f59e0b)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "10px 16px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Place Bet
          </button>
        </div>
      )}

      {!betOpen && (
        <div
          style={{
            color: "#9db5cf",
            fontSize: 11,
            background: "rgba(148,163,184,0.08)",
            border: "1px solid rgba(148,163,184,0.14)",
            borderRadius: 14,
            padding: "10px 12px",
          }}
        >
          {resolved
            ? "This market is resolved already, so the matchup stays visible for history and scouting but new bets are locked."
            : game.bettingLocked
              ? "This matchup is visible for scouting, but betting is locked until the earlier games settle."
              : "This matchup is more than 3 days away, so it stays visible for scouting but the bet buttons stay locked for now."}
        </div>
      )}
    </div>
  );
}

function Feed({ items }) {
  return (
    <div
      style={{
        background: "linear-gradient(180deg, rgba(21,31,49,0.96), rgba(12,18,31,0.96))",
        borderRadius: 20,
        padding: 16,
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div style={{ color: "#f6c56a", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 10 }}>
        Community Pulse
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 280, overflowY: "auto" }}>
        {items.length ? (
          items.map((item, index) => (
            <div
              key={`${item}-${index}`}
              style={{
                padding: "10px 12px",
                borderRadius: 14,
                color: "#d5e0f0",
                fontSize: 11,
                background: "rgba(255,255,255,0.03)",
                borderLeft: "3px solid rgba(246,197,106,0.7)",
                animation: index === 0 ? "slideIn 0.25s ease" : "none",
              }}
            >
              {item}
            </div>
          ))
        ) : (
          <div style={{ color: "#8da2bd", fontSize: 11, textAlign: "center", padding: 24 }}>Waiting for fresh market chatter.</div>
        )}
      </div>
    </div>
  );
}

function ScoutDesk({ game, market, thread, onAsk }) {
  const [question, setQuestion] = useState("");

  if (!game) {
    return null;
  }

  const homeTeam = TEAM_LOOKUP[game.home];
  const awayTeam = TEAM_LOOKUP[game.away];
  const homeSummary = TEAM_SUMMARIES[game.home];
  const awaySummary = TEAM_SUMMARIES[game.away];

  const submit = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAsk(game, trimmed);
    setQuestion("");
  };

  const statCards = [
    { team: awayTeam, summary: awaySummary },
    { team: homeTeam, summary: homeSummary },
  ];

  return (
    <div
      style={{
        background: "linear-gradient(180deg, rgba(21,31,49,0.98), rgba(12,18,31,0.98))",
        borderRadius: 20,
        padding: 16,
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ color: "#f6c56a", fontSize: 11, fontWeight: 900, letterSpacing: 1.1, textTransform: "uppercase" }}>HotShot AI Scout</div>
          <div style={{ color: "#fff4db", fontSize: 16, fontWeight: 800, marginTop: 4 }}>
            {awayTeam.short} at {homeTeam.short}
          </div>
          <div style={{ color: "#8da2bd", fontSize: 11, marginTop: 4 }}>Uses stored matchup history, market movement, and team profiles.</div>
        </div>
        <span
          style={{
            padding: "5px 9px",
            borderRadius: 999,
            border: "1px solid rgba(246,197,106,0.18)",
            color: "#f6c56a",
            fontSize: 10,
            fontWeight: 800,
            background: "rgba(246,197,106,0.08)",
          }}
        >
          model only
        </span>
      </div>

      <div className="scout-stats" style={{ display: "grid", gap: 10, marginBottom: 12 }}>
        {statCards.map(({ team, summary }) => (
          <div
            key={team.name}
            style={{
              padding: 12,
              borderRadius: 16,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <TeamBadge team={team} size={42} />
              <div>
                <div style={{ color: "#fff", fontSize: 13, fontWeight: 800 }}>{team.short}</div>
                <div style={{ color: "#8da2bd", fontSize: 10 }}>{summary.recordLastFive} in last five</div>
              </div>
            </div>
            <div style={{ color: "#d6e2f3", fontSize: 11, lineHeight: 1.5 }}>
              <div>Scoring trend: {summary.avgFor}</div>
              <div>Allowed trend: {summary.avgAgainst}</div>
              <div>Streak: {summary.streak}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {SCOUT_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => submit(prompt)}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#d6e2f3",
              borderRadius: 999,
              padding: "7px 10px",
              fontSize: 10,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto", marginBottom: 12 }}>
        {thread.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            style={{
              alignSelf: message.role === "user" ? "flex-end" : "stretch",
              background: message.role === "user" ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${message.role === "user" ? "rgba(249,115,22,0.24)" : "rgba(255,255,255,0.06)"}`,
              borderRadius: 16,
              padding: "10px 12px",
            }}
          >
            <div style={{ color: message.role === "user" ? "#f6c56a" : "#8da2bd", fontSize: 9, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>
              {message.role}
            </div>
            <div style={{ color: "#edf4ff", fontSize: 12, lineHeight: 1.55 }}>{message.text}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              submit(question);
            }
          }}
          placeholder="Ask about form, defense, scoring, or who has the edge"
          style={{
            flex: 1,
            background: "rgba(7,13,24,0.85)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#fff",
            borderRadius: 14,
            padding: "11px 12px",
            fontSize: 12,
            outline: "none",
          }}
        />
        <button
          onClick={() => submit(question)}
          style={{
            background: "linear-gradient(135deg, #f97316, #f59e0b)",
            color: "#fff",
            border: "none",
            borderRadius: 14,
            padding: "0 16px",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Ask
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, color: "#8da2bd", fontSize: 10 }}>
        <span>{market?.resolvedAt ? `Resolved toward ${TEAM_LOOKUP[market.outcomeTeam].short}` : "Live chart and chat stay synced to this matchup"}</span>
        <span>History depth: 12 tracked games per team</span>
      </div>
    </div>
  );
}

function Spotlight({ game, query, onClearQuery, onSelectGame }) {
  if (!game) return null;

  const homeTeam = TEAM_LOOKUP[game.home];
  const awayTeam = TEAM_LOOKUP[game.away];
  const dateLabel = isResolvedGame(game)
    ? `Resolved · ${formatGameDate(game.startsAt)}`
    : game.status === "live"
      ? `Live now · ${game.clock}`
      : `${formatGameDate(game.startsAt)} · ${formatGameTime(game.startsAt)}`;

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${awayTeam.colors[0]}22, ${homeTeam.colors[0]}22 60%, rgba(255,255,255,0.05))`,
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 28,
        padding: 20,
        marginBottom: 14,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "auto -40px -60px auto",
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${homeTeam.colors[0]}44, transparent 72%)`,
          pointerEvents: "none",
        }}
      />
      <div className="spotlight-row" style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", position: "relative" }}>
        <div style={{ maxWidth: 460 }}>
          <div style={{ color: "#f6c56a", fontSize: 11, fontWeight: 900, letterSpacing: 1.2, textTransform: "uppercase" }}>Featured Market</div>
          <div style={{ color: "#fff", fontSize: 28, fontWeight: 900, marginTop: 6 }}>
            {awayTeam.short} vs {homeTeam.short}
          </div>
          <div style={{ color: "#d8e4f3", fontSize: 13, marginTop: 6 }}>
            One chart per matchup, team histories, and scouting all tied to the same game card.
          </div>
          <div style={{ color: "#9db5cf", fontSize: 11, marginTop: 10 }}>{dateLabel}</div>
          {query && (
            <button
              onClick={onClearQuery}
              style={{
                marginTop: 12,
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 999,
                padding: "6px 10px",
                fontSize: 10,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Clear search: {query}
            </button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <TeamBadge team={awayTeam} size={68} />
            <span style={{ color: "#dbe7f6", fontSize: 12, fontWeight: 800 }}>{awayTeam.short}</span>
          </div>
          <div style={{ color: "#f6c56a", fontSize: 26, fontWeight: 900 }}>VS</div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <TeamBadge team={homeTeam} size={68} />
            <span style={{ color: "#dbe7f6", fontSize: 12, fontWeight: 800 }}>{homeTeam.short}</span>
          </div>
          <button
            onClick={onSelectGame}
            style={{
              background: "linear-gradient(135deg, #f97316, #f59e0b)",
              color: "#fff",
              border: "none",
              borderRadius: 16,
              padding: "12px 16px",
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: "0 10px 24px rgba(249,115,22,0.28)",
            }}
          >
            Open AI Scout
          </button>
        </div>
      </div>
    </div>
  );
}

function ScheduleSection({ title, description, games, markets, bets, onBet, onSelect, selectedGameId }) {
  if (!games.length) return null;
  const sportBackgroundPosition = getSportBackgroundPosition(games[0].sport);

  return (
    <div
      style={{
        marginTop: 18,
        padding: 16,
        borderRadius: 24,
        backgroundImage: `linear-gradient(180deg, rgba(8,15,26,0.78), rgba(8,15,26,0.94)), url(${SPORT_BACKGROUNDS[games[0].sport]})`,
        backgroundPosition: `center, ${sportBackgroundPosition}`,
        backgroundSize: `auto, ${BACKGROUND_SIZE}`,
        backgroundRepeat: "no-repeat",
        backgroundColor: "#09111d",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 18px 48px rgba(0,0,0,0.24)",
      }}
    >
      <div style={{ marginBottom: 10 }}>
        <div style={{ color: "#fff", fontSize: 18, fontWeight: 900 }}>{title}</div>
        <div style={{ color: "#8da2bd", fontSize: 12, marginTop: 3 }}>{description}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {games.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            market={markets[game.id]}
            bet={bets.find((ticket) => ticket.gameId === game.id)}
            onBet={onBet}
            selected={selectedGameId === game.id}
            onSelect={() => onSelect(game.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ParlayBuilder({ games, onPlace, pts, unavailableGameIds = new Set(), onBlockedGame }) {
  const [legs, setLegs] = useState([]);
  const [wager, setWager] = useState("");
  const availableGames = allGames(games).filter((game) => isBettableGame(game) && !isResolvedGame(game));

  const addLeg = (game, team, odds) => {
    if (unavailableGameIds.has(game.id)) {
      onBlockedGame?.();
      return;
    }
    if (legs.find((leg) => leg.gid === game.id)) return;
    setLegs((current) => [
      ...current,
      {
        gid: game.id,
        team,
        odds,
        label: `${TEAM_LOOKUP[game.away].short} vs ${TEAM_LOOKUP[game.home].short}`,
      },
    ]);
  };

  const removeLeg = (gid) => setLegs((current) => current.filter((leg) => leg.gid !== gid));
  const decimalOdds = legs.reduce((total, leg) => total * (leg.odds > 0 ? 1 + leg.odds / 100 : 1 + 100 / Math.abs(leg.odds)), 1);
  const potentialWin = wager ? Math.round(Number(wager) * (decimalOdds - 1)) : 0;

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 900, marginBottom: 6 }}>Parlay Builder</h2>
        <p style={{ color: "#8da2bd", fontSize: 12, margin: 0 }}>
          Only games inside the 3-day betting window appear here. Stack two or more sides into one ticket.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
        {availableGames.map((game) => {
          const inParlay = legs.find((leg) => leg.gid === game.id);
          const alreadyPlaced = unavailableGameIds.has(game.id);
          return (
            <div
              key={game.id}
              style={{
                background: "linear-gradient(180deg, rgba(22,34,54,0.92), rgba(13,20,34,0.96))",
                borderRadius: 16,
                padding: 14,
                border: inParlay ? "1px solid rgba(246,197,106,0.4)" : alreadyPlaced ? "1px solid rgba(239,68,68,0.28)" : "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ color: "#fff", fontSize: 13, fontWeight: 800 }}>
                  {SPORT_CONFIG[game.sport].icon} {TEAM_LOOKUP[game.away].short} vs {TEAM_LOOKUP[game.home].short}
                </div>
                <div style={{ color: "#8da2bd", fontSize: 11, marginTop: 4 }}>
                  {alreadyPlaced ? "You have already placed a bet on it" : `${formatGameDate(game.startsAt)} · ${formatGameTime(game.startsAt)}`}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button
                  onClick={() => addLeg(game, game.away, game.awayOdds)}
                  disabled={Boolean(inParlay)}
                  style={{
                    background: inParlay?.team === game.away ? "rgba(249,115,22,0.18)" : "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: inParlay?.team === game.away ? "#f6c56a" : "#dbe7f6",
                    borderRadius: 12,
                    padding: "8px 10px",
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: inParlay ? "default" : "pointer",
                  }}
                >
                  {TEAM_LOOKUP[game.away].short} {formatOdds(game.awayOdds)}
                </button>
                <button
                  onClick={() => addLeg(game, game.home, game.homeOdds)}
                  disabled={Boolean(inParlay)}
                  style={{
                    background: inParlay?.team === game.home ? "rgba(249,115,22,0.18)" : "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: inParlay?.team === game.home ? "#f6c56a" : "#dbe7f6",
                    borderRadius: 12,
                    padding: "8px 10px",
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: inParlay ? "default" : "pointer",
                  }}
                >
                  {TEAM_LOOKUP[game.home].short} {formatOdds(game.homeOdds)}
                </button>
                {inParlay && (
                  <button
                    onClick={() => removeLeg(game.id)}
                    style={{
                      background: "rgba(239,68,68,0.12)",
                      border: "1px solid rgba(239,68,68,0.22)",
                      color: "#f87171",
                      borderRadius: 12,
                      padding: "8px 10px",
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {legs.length > 0 && (
        <div
          style={{
            background: "linear-gradient(180deg, rgba(21,31,49,0.98), rgba(12,18,31,0.98))",
            borderRadius: 20,
            padding: 18,
            border: "1px solid rgba(246,197,106,0.28)",
          }}
        >
          <div style={{ color: "#f6c56a", fontSize: 12, fontWeight: 900, marginBottom: 10 }}>Current Slip</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
            {legs.map((leg) => (
              <div key={leg.gid} style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "#dbe7f6", fontSize: 12 }}>
                <span>{TEAM_LOOKUP[leg.team].short}</span>
                <span style={{ color: "#f6c56a", fontWeight: 800 }}>{formatOdds(leg.odds)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ color: "#8da2bd", fontSize: 11 }}>Projected payout</div>
              <div style={{ color: "#4ade80", fontSize: 18, fontWeight: 900 }}>+{potentialWin}</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="number"
                min="10"
                value={wager}
                onChange={(event) => setWager(event.target.value)}
                placeholder="Wager"
                style={{
                  width: 100,
                  background: "rgba(7,13,24,0.85)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff",
                  borderRadius: 14,
                  padding: "10px 12px",
                  fontSize: 12,
                  outline: "none",
                }}
              />
              <button
                onClick={() => {
                  const parsed = Number(wager);
                  if (legs.length < 2 || !parsed || parsed < 10 || parsed > pts) return;
                  onPlace({
                    legs,
                    wager: parsed,
                    potentialWin,
                    totalOdds: Math.round((decimalOdds - 1) * 100),
                  });
                  setLegs([]);
                  setWager("");
                }}
                style={{
                  background: legs.length >= 2 ? "linear-gradient(135deg, #f97316, #f59e0b)" : "rgba(255,255,255,0.08)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 14,
                  padding: "11px 16px",
                  fontWeight: 900,
                  cursor: legs.length >= 2 ? "pointer" : "default",
                }}
              >
                Place Parlay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function History({ bets, parlays }) {
  const combined = [
    ...bets.map((bet) => ({ ...bet, kind: "moneyline" })),
    ...parlays.map((parlay) => ({
      ...parlay,
      kind: "parlay",
      team: parlay.legs.map((leg) => TEAM_LOOKUP[leg.team].short).join(" + "),
    })),
  ];
  const pending = combined.filter((item) => !item.result);
  const settled = combined.filter((item) => item.result);

  if (!combined.length) {
    return (
      <div style={{ textAlign: "center", padding: 60, color: "#8da2bd" }}>
        <div style={{ fontSize: 42 }}>📭</div>
        <div style={{ fontSize: 16, marginTop: 10 }}>No bets yet</div>
      </div>
    );
  }

  const summary = [
    { label: "Total", value: combined.length, color: "#fff" },
    { label: "Pending", value: pending.length, color: "#f6c56a" },
    { label: "Wins", value: settled.filter((item) => item.result === "win").length, color: "#4ade80" },
    { label: "Losses", value: settled.filter((item) => item.result === "loss").length, color: "#f87171" },
  ];

  const sections = [
    { title: "Pending", items: pending, tint: "#f6c56a" },
    { title: "Settled", items: settled, tint: "#8da2bd" },
  ];

  return (
    <div>
      <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 900, marginBottom: 16 }}>History</h2>
      <div className="history-grid" style={{ display: "grid", gap: 10, marginBottom: 18 }}>
        {summary.map((card) => (
          <div
            key={card.label}
            style={{
              background: "linear-gradient(180deg, rgba(22,34,54,0.92), rgba(13,20,34,0.96))",
              borderRadius: 16,
              padding: 14,
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div style={{ color: "#8da2bd", fontSize: 10, fontWeight: 800, marginBottom: 4 }}>{card.label}</div>
            <div style={{ color: card.color, fontSize: 24, fontWeight: 900 }}>{card.value}</div>
          </div>
        ))}
      </div>

      {sections.map((section) =>
        section.items.length ? (
          <div key={section.title} style={{ marginBottom: 18 }}>
            <div style={{ color: section.tint, fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 8 }}>
              {section.title}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {section.items.map((item, index) => (
                <div
                  key={`${section.title}-${index}`}
                  style={{
                    background: "linear-gradient(180deg, rgba(22,34,54,0.92), rgba(13,20,34,0.96))",
                    borderRadius: 16,
                    padding: 14,
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ color: "#fff", fontSize: 13, fontWeight: 800 }}>{item.team}</div>
                    <div style={{ color: "#8da2bd", fontSize: 11, marginTop: 4 }}>
                      {item.startsAt ? `${formatGameDate(item.startsAt)} · ${formatGameTime(item.startsAt)}` : "Multi-leg ticket"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "#dbe7f6", fontSize: 12, fontWeight: 800 }}>{item.wager} pts</div>
                    <div
                      style={{
                        color: item.result === "win" ? "#4ade80" : item.result === "loss" ? "#f87171" : "#f6c56a",
                        fontSize: 11,
                        fontWeight: 900,
                        marginTop: 4,
                      }}
                    >
                      {item.result === "win" && `+${item.potentialWin}`}
                      {item.result === "loss" && `-${item.wager}`}
                      {!item.result && "Pending"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}

function Leaderboard({ user, entries = [] }) {
  const all = [...entries];
  all.sort((left, right) => right.points - left.points);

  return (
    <div>
      <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 900, marginBottom: 16 }}>Leaderboard</h2>
      {!all.length && (
        <div style={{ color: "#8da2bd", fontSize: 12, marginBottom: 12 }}>
          No database leaderboard rows yet. Create accounts or refresh after the backend connects.
        </div>
      )}
      <div
        style={{
          background: "linear-gradient(180deg, rgba(22,34,54,0.92), rgba(13,20,34,0.96))",
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "52px 1fr 100px 60px 60px", padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          {["#", "Player", "Points", "W", "L"].map((heading) => (
            <div key={heading} style={{ color: "#8da2bd", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>
              {heading}
            </div>
          ))}
        </div>
        {all.map((entry, index) => {
          const isCurrentUser = entry.username === user.username;
          return (
            <div
              key={entry.username}
              style={{
                display: "grid",
                gridTemplateColumns: "52px 1fr 100px 60px 60px",
                padding: "14px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: isCurrentUser ? "rgba(249,115,22,0.08)" : "transparent",
              }}
            >
              <div style={{ color: index < 3 ? ["#fbbf24", "#cbd5e1", "#d97706"][index] : "#8da2bd", fontWeight: 900 }}>{index + 1}</div>
              <div style={{ color: isCurrentUser ? "#f6c56a" : "#fff", fontWeight: 800 }}>
                {entry.username}
                {isCurrentUser && <span style={{ color: "#8da2bd", fontSize: 10 }}> (you)</span>}
              </div>
              <div style={{ color: "#f6c56a", fontWeight: 900 }}>{entry.points.toLocaleString()}</div>
              <div style={{ color: "#4ade80" }}>{entry.wins}</div>
              <div style={{ color: "#f87171" }}>{entry.losses}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [register, setRegister] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Fill in both fields.");
      return;
    }
    if (register && password.trim().length < 6) {
      setError("Use at least 6 characters.");
      return;
    }
    const result = await onLogin({ username: username.trim(), password: password.trim(), register });
    if (result?.error) {
      setError(result.error);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: `linear-gradient(180deg, rgba(9,17,29,0.5), rgba(9,17,29,0.94)), url(${SPORT_BACKGROUNDS.nba})`,
        backgroundPosition: "center, center top",
        backgroundSize: "auto, contain",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#09111d",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        className="login-grid"
        style={{
          width: 920,
          maxWidth: "100%",
          display: "grid",
          background: "rgba(13,20,34,0.76)",
          backdropFilter: "blur(16px)",
          borderRadius: 28,
          border: "1px solid rgba(255,255,255,0.08)",
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.38)",
        }}
      >
        <div style={{ padding: 34, borderRight: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ color: "#f6c56a", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1.2 }}>HotShot: Let the Parlays Begin!</div>
          <h1 style={{ color: "#fff", fontSize: 40, lineHeight: 1, margin: "12px 0 10px" }}>One chart per game. Scouting built in.</h1>
          <p style={{ color: "#9db5cf", fontSize: 14, maxWidth: 480, margin: 0 }}>
            Track one market for each matchup, search teams faster, scout historical form, and browse upcoming games.
          </p>
          <div
            style={{
              minHeight: 360,
              marginTop: 28,
              borderRadius: 22,
              backgroundImage: `linear-gradient(90deg, rgba(13,20,34,0.08), rgba(13,20,34,0.58)), url(${SPORT_BACKGROUNDS.nba})`,
              backgroundPosition: "center, center top",
              backgroundSize: "auto, cover",
              backgroundRepeat: "no-repeat",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          />
        </div>

        <div style={{ padding: 34 }}>
          <div style={{ color: "#fff", fontSize: 24, fontWeight: 900, marginBottom: 8 }}>{register ? "Create account" : "Welcome back"}</div>
          <div style={{ color: "#8da2bd", fontSize: 12, marginBottom: 22 }}>Everything below runs on points, stored markets, and sports data.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setError("");
              }}
              placeholder="Username"
              style={{
                background: "rgba(7,13,24,0.85)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#fff",
                borderRadius: 16,
                padding: "13px 14px",
                fontSize: 14,
                outline: "none",
              }}
            />
            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") submit();
              }}
              placeholder="Password"
              style={{
                background: "rgba(7,13,24,0.85)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#fff",
                borderRadius: 16,
                padding: "13px 14px",
                fontSize: 14,
                outline: "none",
              }}
            />
            {error && <div style={{ color: "#f87171", fontSize: 11 }}>{error}</div>}
            <button
              onClick={submit}
              style={{
                background: "linear-gradient(135deg, #f97316, #f59e0b)",
                color: "#fff",
                border: "none",
                borderRadius: 16,
                padding: "13px 16px",
                fontSize: 14,
                fontWeight: 900,
                cursor: "pointer",
                boxShadow: "0 12px 28px rgba(249,115,22,0.28)",
              }}
            >
              {register ? "Create HotShot profile" : "Log in"}
            </button>
            <button
              onClick={() => setRegister((current) => !current)}
              style={{
                background: "transparent",
                border: "none",
                color: "#f6c56a",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                padding: 0,
                textAlign: "left",
              }}
            >
              {register ? "Already have an account? Log in" : "Need an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("games");
  const [sport, setSport] = useState("nba");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [bets, setBets] = useState([]);
  const [parlays, setParlays] = useState([]);
  const [toast, setToast] = useState(null);
  const [feed, setFeed] = useState([]);
  const [games, setGames] = useState(() => generateGames());
  const [apiConnected, setApiConnected] = useState(false);
  const [markets, setMarkets] = useState(() => createInitialMarkets(games));
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [aiThreads, setAiThreads] = useState({});
  const toastTimerRef = useRef(null);

  const showToast = (message, type = "success") => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3200);
  };

  const refreshGamesFromApi = async () => {
    if (!API_BASE_URL) return;
    const payload = await apiRequest("/games");
    const groupedGames = groupApiGames(payload.games || []);
    setGames(groupedGames);
    setMarkets(createInitialMarkets(groupedGames));
    setApiConnected(true);
  };

  const refreshUserRecordsFromApi = async () => {
    if (!API_BASE_URL || !localStorage.getItem(AUTH_TOKEN_KEY)) return;
    const [betsPayload, parlaysPayload, leaderboardPayload] = await Promise.all([
      apiRequest("/bets"),
      apiRequest("/parlays"),
      apiRequest("/leaderboard"),
    ]);
    setBets((betsPayload.bets || []).map(normalizeApiBet));
    setParlays((parlaysPayload.parlays || []).map(normalizeApiParlay));
    setLeaderboard(leaderboardPayload.leaderboard || []);
    setApiConnected(true);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!API_BASE_URL) return;

    refreshGamesFromApi().catch(() => {
      setApiConnected(false);
    });

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      apiRequest("/me")
        .then((payload) => {
          setUser(payload.user);
          return refreshUserRecordsFromApi();
        })
        .catch(() => {
          localStorage.removeItem(AUTH_TOKEN_KEY);
        });
    }
  }, []);

  useEffect(() => {
    if (!user || !API_BASE_URL || !localStorage.getItem(AUTH_TOKEN_KEY)) return undefined;
    if (!parlays.some((parlay) => !parlay.result)) return undefined;

    const interval = setInterval(() => {
      refreshUserRecordsFromApi().catch(() => setApiConnected(false));
    }, 3500);
    return () => clearInterval(interval);
  }, [user, parlays]);

  useEffect(() => {
    if (!user) return undefined;
    const interval = setInterval(() => {
      const message = genCommunityMsg(games);
      if (message) {
        setFeed((current) => [message, ...current].slice(0, 36));
      }
    }, 2200);
    return () => clearInterval(interval);
  }, [games, user]);

  useEffect(() => {
    if (!user) return undefined;

    const interval = setInterval(() => {
      setMarkets((current) => {
        let changed = false;
        const next = { ...current };

        allGames(games).forEach((game) => {
          const market = current[game.id];
          if (!market || market.resolvedAt) return;

          const shouldAnimate = game.status === "live" || Boolean(market.resolveAt);
          if (!shouldAnimate) return;

          const tick = (market.tick || 0) + 1;
          let price = Number.isFinite(market.price) ? market.price : americanToProbability(game.homeOdds);
          const priceHistory = market.priceHistory?.length ? market.priceHistory : [{ t: market.tick || 0, p: price }];

          if (market.resolveAt && market.outcomeTeam) {
            const target = market.outcomeTeam === game.home ? 0.99 : 0.01;
            const ticksLeft = market.resolveAt - tick;
            const drift = ticksLeft < 10 ? 0.24 : 0.08;
            price = clamp(price + (target - price) * drift + seededNumber(`${game.id}-${tick}`, -0.02, 0.02), 0.01, 0.99);

            if (tick >= market.resolveAt) {
              const finalPrice = market.outcomeTeam === game.home ? 0.99 : 0.01;
              next[game.id] = {
                ...market,
                tick,
                price: finalPrice,
                priceHistory: [...priceHistory.slice(-63), { t: tick, p: finalPrice }],
                resolvedAt: Date.now(),
              };
              changed = true;
              return;
            }
          } else {
            const baseline = americanToProbability(game.homeOdds);
            const volatility = game.status === "live" ? 0.045 : 0.015;
            price = clamp(price + seededNumber(`${game.id}-${tick}`, -volatility, volatility) + (baseline - price) * 0.06, 0.12, 0.88);
          }

          const rounded = Number(price.toFixed(2));
          next[game.id] = {
            ...market,
            tick,
            price: rounded,
            priceHistory: [...priceHistory.slice(-63), { t: tick, p: rounded }],
          };
          changed = true;
        });

        return changed ? next : current;
      });
    }, 350);

    return () => clearInterval(interval);
  }, [games, user]);

  useEffect(() => {
    const unresolved = bets.filter((bet) => !bet.result && markets[bet.gameId]?.resolvedAt);
    if (!unresolved.length) return;

    setBets((current) =>
      current.map((bet) => {
        const market = markets[bet.gameId];
        if (bet.result || !market?.resolvedAt) return bet;
        return {
          ...bet,
          result: bet.team === market.outcomeTeam ? "win" : "loss",
          winningTeam: market.outcomeTeam,
          settledAt: market.resolvedAt,
        };
      })
    );

    unresolved.forEach((bet) => {
      const market = markets[bet.gameId];
      const won = bet.team === market.outcomeTeam;
      if (API_BASE_URL && localStorage.getItem(AUTH_TOKEN_KEY) && bet.id) {
        apiRequest("/settle-bet", {
          method: "POST",
          body: JSON.stringify({ betId: bet.id, outcomeTeam: market.outcomeTeam }),
        })
          .then((payload) => {
            if (payload.user) setUser(payload.user);
            if (payload.leaderboard) setLeaderboard(payload.leaderboard);
            setApiConnected(true);
          })
          .catch(() => {
            setApiConnected(false);
          });
      }
      if (won) {
        setUser((current) => ({
          ...current,
          points: current.points + bet.wager + bet.potentialWin,
          wins: current.wins + 1,
        }));
        showToast(`Won +${bet.potentialWin} on ${TEAM_LOOKUP[bet.team].short}`);
      } else {
        setUser((current) => ({
          ...current,
          losses: current.losses + 1,
        }));
        showToast(`${TEAM_LOOKUP[bet.team].short} came up short.`, "error");
      }
    });
  }, [bets, markets]);

  const filteredGames = (games[sport] || []).filter((game) => {
    if (!deferredSearch.trim()) return true;
    const searchTerm = deferredSearch.trim().toLowerCase();
    const homeTeam = TEAM_LOOKUP[game.home];
    const awayTeam = TEAM_LOOKUP[game.away];
    return (
      game.home.toLowerCase().includes(searchTerm) ||
      game.away.toLowerCase().includes(searchTerm) ||
      homeTeam.short.toLowerCase().includes(searchTerm) ||
      awayTeam.short.toLowerCase().includes(searchTerm) ||
      homeTeam.code.toLowerCase().includes(searchTerm) ||
      awayTeam.code.toLowerCase().includes(searchTerm)
    );
  });

  const emptySearchMessage =
    ELIMINATED_TEAM_MESSAGES.find((item) => item.terms.some((term) => deferredSearch.trim().toLowerCase().includes(term)))?.message ||
    `No matchups found for "${deferredSearch}".`;

  const filteredIds = filteredGames.map((game) => game.id).join("|");

  useEffect(() => {
    if (!filteredGames.length) {
      setSelectedGameId(null);
      return;
    }
    if (!filteredGames.find((game) => game.id === selectedGameId)) {
      setSelectedGameId(filteredGames[0].id);
    }
  }, [filteredIds, selectedGameId]);

  const selectedGame = filteredGames.find((game) => game.id === selectedGameId) || filteredGames[0] || games[sport]?.[0] || null;

  useEffect(() => {
    if (!selectedGame) return;
    setAiThreads((current) => {
      if (current[selectedGame.id]) return current;
      return {
        ...current,
        [selectedGame.id]: [{ role: "scout", text: buildOpeningScoutMessage(selectedGame, markets[selectedGame.id]) }],
      };
    });
  }, [selectedGame, markets]);

  const resolvedGames = filteredGames.filter((game) => isResolvedGame(game) || markets[game.id]?.resolvedAt);
  const liveGames = filteredGames.filter((game) => game.status === "live" && !resolvedGames.includes(game));
  const nearGames = filteredGames.filter((game) => game.status !== "live" && !resolvedGames.includes(game) && isBettableGame(game));
  const laterGames = filteredGames.filter((game) => game.status !== "live" && !resolvedGames.includes(game) && !isBettableGame(game));
  const placedGameIds = new Set([
    ...bets.map((bet) => bet.gameId),
    ...parlays.flatMap((parlay) => (parlay.legs || []).map((leg) => leg.gid || leg.gameId)),
  ]);

  const placeBet = async (game, team, wagerValue) => {
    const wager = Number(wagerValue);
    const market = markets[game.id];

    if (!wager || wager < 10) {
      showToast("Use at least 10 points for a ticket.", "error");
      return;
    }
    if (!isBettableGame(game)) {
      showToast(
        isResolvedGame(game)
          ? "That market is already resolved."
          : game.bettingLocked
            ? "That market is locked until closer to game day."
            : "That game is outside the 3-day betting window.",
        "error"
      );
      return;
    }
    if (placedGameIds.has(game.id)) {
      showToast("You have already placed a bet on it.", "error");
      return;
    }
    if (wager > user.points) {
      showToast(user.points <= 0 ? "Out of points. Wait 24 hours to receive 100 points." : "Not enough points.", "error");
      return;
    }
    if (!market || market.resolveAt || market.resolvedAt) {
      showToast("That market is already resolving.", "error");
      return;
    }

    const odds = team === game.home ? game.homeOdds : game.awayOdds;
    const marketPrice = Number.isFinite(market.price) ? market.price : americanToProbability(game.homeOdds);
    const entryPrice = Number((team === game.home ? marketPrice : 1 - marketPrice).toFixed(2));
    const outcomeTeam = Math.random() < marketPrice ? game.home : game.away;
    let apiBet = null;
    let userUpdatedByApi = false;

    if (API_BASE_URL && localStorage.getItem(AUTH_TOKEN_KEY)) {
      try {
        const payload = await apiRequest("/bets", {
          method: "POST",
          body: JSON.stringify({ gameId: game.id, team, wager }),
        });
        apiBet = payload.bet || null;
        if (payload.user) {
          setUser(payload.user);
          userUpdatedByApi = true;
        }
        apiRequest("/leaderboard")
          .then((leaderboardPayload) => setLeaderboard(leaderboardPayload.leaderboard || []))
          .catch(() => {});
        setApiConnected(true);
      } catch (error) {
        setApiConnected(false);
        showToast(error.message, "error");
        return;
      }
    }

    setBets((current) => [
      ...current,
      {
        id: apiBet?.id,
        gameId: game.id,
        team,
        odds,
        wager,
        type: "moneyline",
        sport: game.sport,
        startsAt: game.startsAt,
        entryPrice,
        entryTick: market.tick,
        potentialWin: calcPayout(wager, odds),
      },
    ]);
    setMarkets((current) => ({
      ...current,
      [game.id]: {
        ...current[game.id],
        resolveAt: current[game.id].tick + 32,
        outcomeTeam,
      },
    }));
    if (!userUpdatedByApi) {
      setUser((current) => ({ ...current, points: current.points - wager }));
    }
    showToast(`Locked ${wager} pts on ${TEAM_LOOKUP[team].short}`);
  };

  const placeParlay = async (parlay) => {
    if (parlay.legs.some((leg) => placedGameIds.has(leg.gid || leg.gameId))) {
      showToast("You have already placed a bet on it.", "error");
      return;
    }

    if (parlay.wager > user.points) {
      showToast(user.points <= 0 ? "Out of points. Wait 24 hours to receive 100 points." : "Not enough points for that parlay.", "error");
      return;
    }

    let userUpdatedByApi = false;
    let apiParlay = null;
    if (API_BASE_URL && localStorage.getItem(AUTH_TOKEN_KEY)) {
      try {
        const payload = await apiRequest("/parlays", {
          method: "POST",
          body: JSON.stringify(parlay),
        });
        apiParlay = payload.parlay || null;
        if (payload.user) {
          setUser(payload.user);
          userUpdatedByApi = true;
        }
        apiRequest("/leaderboard")
          .then((leaderboardPayload) => setLeaderboard(leaderboardPayload.leaderboard || []))
          .catch(() => {});
        setApiConnected(true);
      } catch (error) {
        setApiConnected(false);
        showToast(error.message, "error");
        return;
      }
    }

    const localParlay = { ...parlay, id: apiParlay?.id };
    setParlays((current) => [...current, localParlay]);
    if (!userUpdatedByApi) {
      setUser((current) => ({ ...current, points: current.points - parlay.wager }));
    }
    showToast(`Parlay placed for ${parlay.wager} pts`);

    setTimeout(() => {
      const won = Math.random() > 0.63;
      const result = won ? "win" : "loss";
      setParlays((current) =>
        current.map((item) => (item === localParlay || item.id === localParlay.id ? { ...item, result } : item))
      );

      if (API_BASE_URL && localStorage.getItem(AUTH_TOKEN_KEY) && localParlay.id) {
        apiRequest("/settle-parlay", {
          method: "POST",
          body: JSON.stringify({ parlayId: localParlay.id, result }),
        })
          .then((payload) => {
            if (payload.user) setUser(payload.user);
            if (payload.leaderboard) setLeaderboard(payload.leaderboard);
            setApiConnected(true);
          })
          .catch(() => {
            setApiConnected(false);
          });
      }

      if (won) {
        setUser((current) => ({
          ...current,
          points: current.points + parlay.wager + parlay.potentialWin,
          wins: current.wins + 1,
        }));
        showToast(`Parlay cashed for +${parlay.potentialWin}`);
      } else {
        setUser((current) => ({ ...current, losses: current.losses + 1 }));
        showToast("Parlay missed.", "error");
      }
    }, 11000 + Math.random() * 4000);
  };

  const askScout = (game, question) => {
    const response = buildScoutReply(question, game, markets[game.id]);
    setAiThreads((current) => ({
      ...current,
      [game.id]: [
        ...(current[game.id] || [{ role: "scout", text: buildOpeningScoutMessage(game, markets[game.id]) }]),
        { role: "user", text: question },
        { role: "scout", text: response },
      ],
    }));
  };

  const handleLogin = async ({ username, password, register }) => {
    if (!API_BASE_URL) {
      setUser({ username, points: 1000, wins: 0, losses: 0 });
      return { ok: true };
    }

    try {
      const payload = await apiRequest(register ? "/register" : "/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      localStorage.setItem(AUTH_TOKEN_KEY, payload.token);
      setUser(payload.user);
      setBets([]);
      setParlays([]);
      await refreshGamesFromApi();
      await refreshUserRecordsFromApi();
      return { ok: true };
    } catch (error) {
      setApiConnected(false);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      return { error: error.message };
    }
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const quickTeams = TEAM_LIBRARY[sport].slice(0, 8);
  const activeSportBackground = SPORT_BACKGROUNDS[sport];
  const pageBackground = page === "games" ? activeSportBackground : PAGE_BACKGROUNDS[page];
  const pageBackgroundPosition = page === "games" ? getSportBackgroundPosition(sport) : BACKGROUND_POSITION;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: pageBackground
          ? `linear-gradient(180deg, rgba(9,17,29,0.62), rgba(9,17,29,0.96) 620px), url(${pageBackground})`
          : "radial-gradient(circle at top left, rgba(249,115,22,0.14), transparent 24%), radial-gradient(circle at top right, rgba(59,130,246,0.14), transparent 28%)",
        backgroundPosition: pageBackground ? `center, ${pageBackgroundPosition}` : "top left, top right",
        backgroundSize: pageBackground ? `auto, ${BACKGROUND_SIZE}` : "auto, auto",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#09111d",
        color: "#fff",
        fontFamily: "'Trebuchet MS', 'Avenir Next', sans-serif",
      }}
    >
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          backdropFilter: "blur(18px)",
          background: "rgba(9,17,29,0.88)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          padding: "12px 18px",
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <button
            onClick={() => setPage("games")}
            style={{
              background: "transparent",
              border: "none",
              color: "#fff4db",
              fontSize: 20,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            🔥 HotShot
          </button>
          {["games", "parlays", "history", "leaderboard"].map((item) => (
            <button
              key={item}
              onClick={() => setPage(item)}
              style={{
                background: page === item ? "rgba(249,115,22,0.14)" : "transparent",
                color: page === item ? "#f6c56a" : "#8da2bd",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 999,
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 800,
                textTransform: "capitalize",
                cursor: "pointer",
              }}
            >
              {item}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              background: "rgba(249,115,22,0.12)",
              color: "#f6c56a",
              fontWeight: 900,
              fontSize: 12,
            }}
          >
            💰 {user.points.toLocaleString()}
          </div>
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              background: apiConnected ? "rgba(34,197,94,0.12)" : "rgba(148,163,184,0.1)",
              color: apiConnected ? "#86efac" : "#9db5cf",
              fontWeight: 900,
              fontSize: 11,
            }}
          >
            {apiConnected ? "PostgreSQL live" : "Demo data"}
          </div>
          <div style={{ color: "#dbe7f6", fontSize: 12, fontWeight: 800 }}>{user.username}</div>
          <button
            onClick={() => {
              localStorage.removeItem(AUTH_TOKEN_KEY);
              setUser(null);
              setBets([]);
              setParlays([]);
              setLeaderboard([]);
              setFeed([]);
              setSearch("");
              setPage("games");
            }}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#8da2bd",
              borderRadius: 999,
              padding: "8px 10px",
              fontSize: 11,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "20px 16px 30px" }}>
        {page === "games" && (
          <div className="games-grid" style={{ display: "grid", gap: 16, alignItems: "start" }}>
            <div>
              <Spotlight
                game={selectedGame}
                query={search}
                onClearQuery={() => setSearch("")}
                onSelectGame={() => selectedGame && setSelectedGameId(selectedGame.id)}
              />

              <div
                style={{
                  backgroundImage: `linear-gradient(90deg, rgba(9,17,29,0.92), rgba(9,17,29,0.72)), url(${activeSportBackground})`,
                  backgroundPosition: `center, ${getSportBackgroundPosition(sport)}`,
                  backgroundSize: `auto, ${BACKGROUND_SIZE}`,
                  backgroundRepeat: "no-repeat",
                  backgroundColor: "#09111d",
                  borderRadius: 20,
                  padding: 16,
                  border: "1px solid rgba(255,255,255,0.08)",
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {Object.entries(SPORT_CONFIG).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => setSport(key)}
                        style={{
                          background: sport === key ? "rgba(249,115,22,0.18)" : "rgba(255,255,255,0.04)",
                          color: sport === key ? "#fff4db" : "#9db5cf",
                          border: `1px solid ${sport === key ? "rgba(249,115,22,0.36)" : "rgba(255,255,255,0.08)"}`,
                          borderRadius: 999,
                          padding: "9px 14px",
                          fontSize: 12,
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                      >
                        {config.icon} {config.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ flex: 1, minWidth: 240, maxWidth: 360 }}>
                    <input
                      value={search}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        startTransition(() => setSearch(nextValue));
                      }}
                      placeholder="Search teams, codes, or matchups"
                      style={{
                        width: "100%",
                        background: "rgba(7,13,24,0.85)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "#fff",
                        borderRadius: 14,
                        padding: "11px 12px",
                        fontSize: 12,
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {quickTeams.map((team) => (
                    <button
                      key={team.code}
                      onClick={() => setSearch(team.short)}
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#dbe7f6",
                        borderRadius: 999,
                        padding: "7px 10px",
                        fontSize: 10,
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      {team.icon} {team.short}
                    </button>
                  ))}
                </div>
              </div>

              {filteredGames.length ? (
                <>
                  <ScheduleSection
                    title="Resolved Markets"
                    description="Past games are shown for context, but bets are locked because the outcome is final."
                    games={resolvedGames}
                    markets={markets}
                    bets={bets}
                    onBet={placeBet}
                    onSelect={setSelectedGameId}
                    selectedGameId={selectedGameId}
                  />
                  <ScheduleSection
                    title="Live Now"
                    description="Markets already moving in real time."
                    games={liveGames}
                    markets={markets}
                    bets={bets}
                    onBet={placeBet}
                    onSelect={setSelectedGameId}
                    selectedGameId={selectedGameId}
                  />
                  <ScheduleSection
                    title="Next 3 Days"
                    description="Future games stay bettable only when they are within 3 days."
                    games={nearGames}
                    markets={markets}
                    bets={bets}
                    onBet={placeBet}
                    onSelect={setSelectedGameId}
                    selectedGameId={selectedGameId}
                  />
                  <ScheduleSection
                    title="Later This Month"
                    description="You can scout these games now, but the bet buttons stay locked until they enter the 3-day window."
                    games={laterGames}
                    markets={markets}
                    bets={bets}
                    onBet={placeBet}
                    onSelect={setSelectedGameId}
                    selectedGameId={selectedGameId}
                  />
                </>
              ) : (
                <div
                  style={{
                    background: "linear-gradient(180deg, rgba(21,31,49,0.98), rgba(12,18,31,0.98))",
                    borderRadius: 20,
                    padding: 30,
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#8da2bd",
                    textAlign: "center",
                  }}
                >
                  {emptySearchMessage}
                </div>
              )}
            </div>

            <div className="sidebar-rail" style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 84 }}>
              <ScoutDesk
                key={selectedGame?.id || "empty"}
                game={selectedGame}
                market={selectedGame ? markets[selectedGame.id] : null}
                thread={selectedGame ? aiThreads[selectedGame.id] || [] : []}
                onAsk={askScout}
              />
              <Feed items={feed} />
            </div>
          </div>
        )}

        {page === "parlays" && (
          <ParlayBuilder
            games={games}
            onPlace={placeParlay}
            pts={user.points}
            unavailableGameIds={placedGameIds}
            onBlockedGame={() => showToast("You have already placed a bet on it.", "error")}
          />
        )}
        {page === "history" && <History bets={bets} parlays={parlays} />}
        {page === "leaderboard" && <Leaderboard user={user} entries={leaderboard} />}
      </div>

      {toast && (
        <div
          style={{
            position: "fixed",
            right: 18,
            bottom: 18,
            zIndex: 30,
            padding: "12px 16px",
            borderRadius: 14,
            color: "#fff",
            fontSize: 12,
            fontWeight: 900,
            background: toast.type === "error" ? "rgba(127,29,29,0.96)" : "rgba(20,83,45,0.96)",
            border: `1px solid ${toast.type === "error" ? "rgba(248,113,113,0.5)" : "rgba(74,222,128,0.5)"}`,
            boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
            animation: "slideIn 0.25s ease",
          }}
        >
          {toast.message}
        </div>
      )}

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
        }

        button,
        input {
          font-family: inherit;
        }

        button {
          transition: transform 0.15s ease, opacity 0.15s ease, border-color 0.15s ease;
        }

        button:hover {
          opacity: 0.96;
          transform: translateY(-1px);
        }

        .login-grid {
          grid-template-columns: 1.1fr 0.9fr;
        }

        .summary-strip,
        .history-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .games-grid {
          grid-template-columns: minmax(0, 1fr) 360px;
        }

        .team-picks {
          grid-template-columns: 1fr auto 1fr;
        }

        .scout-stats {
          grid-template-columns: 1fr 1fr;
        }

        input::placeholder {
          color: #61758d;
        }

        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(123, 146, 170, 0.32);
          border-radius: 999px;
        }

        @keyframes slideIn {
          from {
            transform: translateY(12px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @media (max-width: 1120px) {
          nav {
            position: static !important;
          }
        }

        @media (max-width: 1080px) {
          .login-grid,
          .games-grid,
          .scout-stats {
            grid-template-columns: 1fr;
          }

          .sidebar-rail {
            position: static !important;
          }
        }

        @media (max-width: 860px) {
          .spotlight-row,
          .team-picks {
            grid-template-columns: 1fr;
            display: grid !important;
          }

          .summary-strip,
          .history-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .summary-strip,
          .history-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
