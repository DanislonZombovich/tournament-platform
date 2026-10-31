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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
  team1_id TEXT REFERENCES teams(id),
  team2_id TEXT REFERENCES teams(id),
  team1_score INTEGER DEFAULT 0,
  team2_score INTEGER DEFAULT 0,
  winner_id TEXT REFERENCES teams(id),
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
  raw_fantasy_points REAL DEFAULT 0,
  CONSTRAINT uq_match_player UNIQUE (match_id, player_id)
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
  points_earned REAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_user_tournament_role UNIQUE (user_id, tournament_id, role_slot)
);

CREATE TABLE IF NOT EXISTS predictions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  predicted_winner_id TEXT REFERENCES teams(id),
  predicted_team1_score INTEGER NOT NULL,
  predicted_team2_score INTEGER NOT NULL,
  points_awarded INTEGER DEFAULT 0,
  is_calculated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_user_match UNIQUE (user_id, match_id)
);
