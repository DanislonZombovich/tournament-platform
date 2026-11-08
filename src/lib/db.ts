import { PGlite } from "@electric-sql/pglite";
import { neon, Client } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";

let pgliteInstance: PGlite | null = null;
let dbInitialized = false;

function getPglite(): PGlite {
  if (!pgliteInstance) {
    const dataDir = path.join(process.cwd(), ".data", "pglite");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    pgliteInstance = new PGlite(dataDir);
  }
  return pgliteInstance;
}

function getNeonSql() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || !dbUrl.startsWith("postgres")) {
    return null;
  }
  return neon(dbUrl);
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT,
  role TEXT DEFAULT 'user',
  steam_id TEXT UNIQUE,
  steam_name TEXT,
  steam_avatar TEXT,
  discord_id TEXT UNIQUE,
  discord_username TEXT,
  discord_avatar TEXT,
  google_id TEXT UNIQUE,
  google_email TEXT,
  google_avatar TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  verification_code TEXT,
  fantasy_tokens INTEGER DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_verifications (
  email TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tag TEXT NOT NULL,
  logo_url TEXT,
  banner_url TEXT,
  captain_id TEXT REFERENCES users(id),
  invite_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_slot TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_team_role UNIQUE (team_id, role_slot),
  CONSTRAINT uq_team_user UNIQUE (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  format TEXT DEFAULT 'double_elimination',
  max_teams INTEGER DEFAULT 8,
  is_public BOOLEAN DEFAULT TRUE,
  access_code TEXT,
  prize_pool TEXT DEFAULT '$1,000,000',
  banner_url TEXT,
  creator_id TEXT REFERENCES users(id),
  status TEXT DEFAULT 'registration',
  is_fantasy_locked BOOLEAN DEFAULT FALSE,
  is_predictions_locked BOOLEAN DEFAULT FALSE,
  grand_final_format TEXT DEFAULT 'two_matches',
  split_participants_losers BOOLEAN DEFAULT FALSE,
  break_ties_placement BOOLEAN DEFAULT FALSE,
  registration_type TEXT DEFAULT 'public_page',
  entry_fee_type TEXT DEFAULT 'free',
  teams_required BOOLEAN DEFAULT TRUE,
  min_team_size INTEGER DEFAULT 5,
  max_team_size INTEGER DEFAULT 7,
  allow_incomplete_teams BOOLEAN DEFAULT FALSE,
  participant_cap INTEGER DEFAULT 8,
  start_time TIMESTAMP WITH TIME ZONE,
  start_time_tentative BOOLEAN DEFAULT TRUE,
  open_voting_all BOOLEAN DEFAULT FALSE,
  predictions_bracket BOOLEAN DEFAULT TRUE,
  predict_lower_bracket BOOLEAN DEFAULT TRUE,
  prediction_scoring_type TEXT DEFAULT 'exponential',
  allow_predictions_pre_tournament BOOLEAN DEFAULT FALSE,
  exp_shareable_images BOOLEAN DEFAULT FALSE,
  exp_require_verified_emails BOOLEAN DEFAULT FALSE,
  exp_allow_specific_countries BOOLEAN DEFAULT FALSE,
  exp_custom_prediction_fields BOOLEAN DEFAULT FALSE,
  initial_rerolls INTEGER DEFAULT 20,
  signup_token TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tournament_user_tokens (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  tokens INTEGER NOT NULL DEFAULT 20,
  PRIMARY KEY (user_id, tournament_id)
);

CREATE TABLE IF NOT EXISTS tournament_teams (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  seed INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_tournament_team UNIQUE (tournament_id, team_id)
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  match_code TEXT NOT NULL,
  bracket_type TEXT NOT NULL,
  round_name TEXT NOT NULL,
  team1_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
  team2_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
  team1_score INTEGER DEFAULT 0,
  team2_score INTEGER DEFAULT 0,
  winner_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  match_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS match_player_stats (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_slot TEXT NOT NULL,
  kills INTEGER DEFAULT 0,
  deaths INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  last_hits INTEGER DEFAULT 0,
  denies INTEGER DEFAULT 0,
  gpm INTEGER DEFAULT 0,
  wards_placed INTEGER DEFAULT 0,
  wards_destroyed INTEGER DEFAULT 0,
  tower_kills INTEGER DEFAULT 0,
  roshan_kills INTEGER DEFAULT 0,
  first_blood BOOLEAN DEFAULT FALSE,
  stuns REAL DEFAULT 0,
  madstones INTEGER DEFAULT 0,
  camps_stacked INTEGER DEFAULT 0,
  runes INTEGER DEFAULT 0,
  watchers INTEGER DEFAULT 0,
  lotuses INTEGER DEFAULT 0,
  smokes INTEGER DEFAULT 0,
  teamfight_pct REAL DEFAULT 0.6,
  tormentor_kills INTEGER DEFAULT 0,
  courier_kills INTEGER DEFAULT 0,
  game_number INTEGER DEFAULT 1,
  raw_fantasy_points REAL DEFAULT 0,
  CONSTRAINT uq_match_player_game UNIQUE (match_id, player_id, game_number)
);

CREATE TABLE IF NOT EXISTS fantasy_cards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  role_slot TEXT NOT NULL,
  selected_player_id TEXT REFERENCES users(id),
  quality TEXT DEFAULT 'common',
  title TEXT DEFAULT 'Стальной',
  traits JSONB NOT NULL DEFAULT '[]',
  emblems JSONB NOT NULL DEFAULT '[]',
  points_earned REAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_user_tournament_role UNIQUE (user_id, tournament_id, role_slot)
);

CREATE TABLE IF NOT EXISTS predictions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  predicted_winner_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
  predicted_team1_score INTEGER NOT NULL,
  predicted_team2_score INTEGER NOT NULL,
  points_awarded INTEGER DEFAULT 0,
  is_calculated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_user_match UNIQUE (user_id, match_id)
);
`;

export async function initDb() {
  if (dbInitialized) return;

  const alterSql = `
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS format TEXT DEFAULT 'double_elimination';
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS max_teams INTEGER DEFAULT 8;
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS access_code TEXT;
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS prize_pool TEXT DEFAULT '$1,000,000';
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS banner_url TEXT;
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS creator_id TEXT;
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS is_fantasy_locked BOOLEAN DEFAULT FALSE;
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS is_predictions_locked BOOLEAN DEFAULT FALSE;
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS grand_final_format TEXT DEFAULT 'two_matches';
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS split_participants_losers BOOLEAN DEFAULT FALSE;
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS break_ties_placement BOOLEAN DEFAULT FALSE;
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS registration_type TEXT DEFAULT 'public_page';
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS entry_fee_type TEXT DEFAULT 'free';
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS teams_required BOOLEAN DEFAULT TRUE;
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS min_team_size INTEGER DEFAULT 5;
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS max_team_size INTEGER DEFAULT 7;
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS allow_incomplete_teams BOOLEAN DEFAULT FALSE;
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS participant_cap INTEGER DEFAULT 8;
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE;
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS start_time_tentative BOOLEAN DEFAULT TRUE;
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS open_voting_all BOOLEAN DEFAULT FALSE;
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS predictions_bracket BOOLEAN DEFAULT TRUE;
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS predict_lower_bracket BOOLEAN DEFAULT TRUE;
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS prediction_scoring_type TEXT DEFAULT 'exponential';
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS allow_predictions_pre_tournament BOOLEAN DEFAULT FALSE;
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS exp_shareable_images BOOLEAN DEFAULT FALSE;
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS exp_require_verified_emails BOOLEAN DEFAULT FALSE;
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS exp_allow_specific_countries BOOLEAN DEFAULT FALSE;
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS exp_custom_prediction_fields BOOLEAN DEFAULT FALSE;
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS initial_rerolls INTEGER DEFAULT 20;
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS signup_token TEXT UNIQUE;

    ALTER TABLE teams ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_id TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_username TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_avatar TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS google_email TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS google_avatar TEXT;

    ALTER TABLE fantasy_cards ADD COLUMN IF NOT EXISTS quality TEXT DEFAULT 'common';
    ALTER TABLE fantasy_cards ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'Стальной';
    ALTER TABLE fantasy_cards ADD COLUMN IF NOT EXISTS emblems JSONB DEFAULT '[]';

    ALTER TABLE match_player_stats ADD COLUMN IF NOT EXISTS madstones INTEGER DEFAULT 0;
    ALTER TABLE match_player_stats ADD COLUMN IF NOT EXISTS camps_stacked INTEGER DEFAULT 0;
    ALTER TABLE match_player_stats ADD COLUMN IF NOT EXISTS runes INTEGER DEFAULT 0;
    ALTER TABLE match_player_stats ADD COLUMN IF NOT EXISTS watchers INTEGER DEFAULT 0;
    ALTER TABLE match_player_stats ADD COLUMN IF NOT EXISTS lotuses INTEGER DEFAULT 0;
    ALTER TABLE match_player_stats ADD COLUMN IF NOT EXISTS smokes INTEGER DEFAULT 0;
    ALTER TABLE match_player_stats ADD COLUMN IF NOT EXISTS teamfight_pct REAL DEFAULT 0.6;
    ALTER TABLE match_player_stats ADD COLUMN IF NOT EXISTS tormentor_kills INTEGER DEFAULT 0;
    ALTER TABLE match_player_stats ADD COLUMN IF NOT EXISTS courier_kills INTEGER DEFAULT 0;
    ALTER TABLE match_player_stats ADD COLUMN IF NOT EXISTS game_number INTEGER DEFAULT 1;
    ALTER TABLE match_player_stats DROP CONSTRAINT IF EXISTS uq_match_player;
    CREATE UNIQUE INDEX IF NOT EXISTS uq_match_player_game ON match_player_stats(match_id, player_id, game_number);

    CREATE TABLE IF NOT EXISTS tournament_user_tokens (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      tokens INTEGER NOT NULL DEFAULT 20,
      PRIMARY KEY (user_id, tournament_id)
    );

    CREATE TABLE IF NOT EXISTS email_verifications (
      email TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL
    );

    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'matches_team1_id_fkey') THEN
        ALTER TABLE matches DROP CONSTRAINT matches_team1_id_fkey;
        ALTER TABLE matches ADD CONSTRAINT matches_team1_id_fkey FOREIGN KEY (team1_id) REFERENCES teams(id) ON DELETE SET NULL;
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'matches_team2_id_fkey') THEN
        ALTER TABLE matches DROP CONSTRAINT matches_team2_id_fkey;
        ALTER TABLE matches ADD CONSTRAINT matches_team2_id_fkey FOREIGN KEY (team2_id) REFERENCES teams(id) ON DELETE SET NULL;
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'matches_winner_id_fkey') THEN
        ALTER TABLE matches DROP CONSTRAINT matches_winner_id_fkey;
        ALTER TABLE matches ADD CONSTRAINT matches_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES teams(id) ON DELETE SET NULL;
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'predictions_predicted_winner_id_fkey') THEN
        ALTER TABLE predictions DROP CONSTRAINT predictions_predicted_winner_id_fkey;
        ALTER TABLE predictions ADD CONSTRAINT predictions_predicted_winner_id_fkey FOREIGN KEY (predicted_winner_id) REFERENCES teams(id) ON DELETE SET NULL;
      END IF;
    END $$;
  `;

  const insertSql = `
    INSERT INTO tournaments (
      id, title, description, format, max_teams, is_public, prize_pool, banner_url, status, is_fantasy_locked, is_predictions_locked
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `;
  const insertParams = [
    "ti-2026-main",
    "The International 2026: Compendium Championship",
    "Официальный главный чемпионат The International 2026 с полным фэнтези-ростером Valve и прогнозами на матчи.",
    "double_elimination",
    4,
    true,
    "$25,000,000",
    "/banner.jpg",
    "registration",
    false,
    false,
  ];

  const updateSql = `
    UPDATE tournaments 
    SET description = COALESCE(description, 'Официальный главный чемпионат The International 2026 с полным фэнтези-ростером Valve и прогнозами на матчи.'),
        banner_url = COALESCE(banner_url, '/banner.jpg'),
        prize_pool = COALESCE(prize_pool, '$25,000,000')
    WHERE id = 'ti-2026-main'
  `;

  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && dbUrl.startsWith("postgres")) {
    const client = new Client({ connectionString: dbUrl });
    await client.connect();
    try {
      await client.query(SCHEMA_SQL);
      try {
        await client.query(alterSql);
      } catch {}

      const defaultTournament = await client.query(`SELECT id FROM tournaments WHERE id = $1`, ["ti-2026-main"]);
      if (defaultTournament.rows.length === 0) {
        await client.query(insertSql, insertParams);
      } else {
        await client.query(updateSql);
      }
    } finally {
      await client.end();
    }
  } else {
    const pglite = getPglite();
    await pglite.exec(SCHEMA_SQL);
    try {
      await pglite.exec(alterSql);
    } catch {}

    const defaultTournament = await pglite.query(`SELECT id FROM tournaments WHERE id = $1`, ["ti-2026-main"]);
    if (defaultTournament.rows.length === 0) {
      await pglite.query(insertSql, insertParams);
    } else {
      await pglite.query(updateSql);
    }
  }

  dbInitialized = true;
}

export async function query<T = any>(sqlText: string, params: any[] = []): Promise<{ rows: T[] }> {
  if (!dbInitialized) {
    await initDb();
  }

  const sql = getNeonSql();
  if (sql) {
    const rows = await sql.query(sqlText, params);
    return { rows: (rows || []) as T[] };
  }

  const pglite = getPglite();
  const res = await pglite.query<T>(sqlText, params);
  return { rows: res.rows };
}
