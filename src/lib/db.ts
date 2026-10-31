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

  dbInitialized = true;

  const defaultTournament = pool
    ? await pool.query(`SELECT id FROM tournaments WHERE id = $1`, ["ti-2026-main"])
    : await getPglite().query(`SELECT id FROM tournaments WHERE id = $1`, ["ti-2026-main"]);

  if (defaultTournament.rows.length === 0) {
    const insertSql = `INSERT INTO tournaments (id, title, status, is_fantasy_locked, is_predictions_locked)
       VALUES ($1, $2, $3, $4, $5)`;
    const insertParams = ["ti-2026-main", "The International 2026: Compendium Championship", "registration", false, false];
    if (pool) {
      await pool.query(insertSql, insertParams);
    } else {
      await getPglite().query(insertSql, insertParams);
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
