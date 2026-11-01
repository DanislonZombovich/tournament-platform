import { PGlite } from "@electric-sql/pglite";
import { Pool } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";

let pgliteInstance: PGlite | null = null;
let neonPoolInstance: Pool | null = null;
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

function getNeonPool(): Pool | null {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || !dbUrl.startsWith("postgres")) {
    return null;
  }
  if (!neonPoolInstance) {
    neonPoolInstance = new Pool({ connectionString: dbUrl });
  }
  return neonPoolInstance;
}

export async function initDb() {
  if (dbInitialized) return;
  const schemaPath = path.join(process.cwd(), "src", "lib", "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");

  const pool = getNeonPool();
  if (pool) {
    await pool.query(schemaSql);
  } else {
    const pglite = getPglite();
    await pglite.exec(schemaSql);
  }

  // Ensure new columns exist on existing tables
  try {
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

      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_id TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_username TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_avatar TEXT;

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
    `;
    if (pool) {
      await pool.query(alterSql);
    } else {
      await getPglite().exec(alterSql);
    }
  } catch {}

  dbInitialized = true;

  // Ensure default TI 2026 tournament exists as a ready-made completed/featured tournament
  const defaultTournament = pool
    ? await pool.query(`SELECT id FROM tournaments WHERE id = $1`, ["ti-2026-main"])
    : await getPglite().query(`SELECT id FROM tournaments WHERE id = $1`, ["ti-2026-main"]);

  if (defaultTournament.rows.length === 0) {
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
    if (pool) {
      await pool.query(insertSql, insertParams);
    } else {
      await getPglite().query(insertSql, insertParams);
    }
  } else {
    // Update description and banner for default tournament if empty
    const updateSql = `
      UPDATE tournaments 
      SET description = COALESCE(description, 'Официальный главный чемпионат The International 2026 с полным фэнтези-ростером Valve и прогнозами на матчи.'),
          banner_url = COALESCE(banner_url, '/banner.jpg'),
          prize_pool = COALESCE(prize_pool, '$25,000,000')
      WHERE id = 'ti-2026-main'
    `;
    if (pool) {
      await pool.query(updateSql);
    } else {
      await getPglite().query(updateSql);
    }
  }
}

export async function query<T = any>(sqlText: string, params: any[] = []): Promise<{ rows: T[] }> {
  if (!dbInitialized) {
    await initDb();
  }

  const pool = getNeonPool();
  if (pool) {
    const res = await pool.query(sqlText, params);
    return { rows: res.rows as T[] };
  }

  const pglite = getPglite();
  const res = await pglite.query<T>(sqlText, params);
  return { rows: res.rows };
}
