"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDb = initDb;
exports.query = query;
const pglite_1 = require("@electric-sql/pglite");
const serverless_1 = require("@neondatabase/serverless");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
let pgliteInstance = null;
let neonPoolInstance = null;
let dbInitialized = false;
function getPglite() {
    if (!pgliteInstance) {
        const dataDir = path_1.default.join(process.cwd(), ".data", "pglite");
        if (!fs_1.default.existsSync(dataDir)) {
            fs_1.default.mkdirSync(dataDir, { recursive: true });
        }
        pgliteInstance = new pglite_1.PGlite(dataDir);
    }
    return pgliteInstance;
}
function getNeonPool() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl || !dbUrl.startsWith("postgres")) {
        return null;
    }
    if (!neonPoolInstance) {
        neonPoolInstance = new serverless_1.Pool({ connectionString: dbUrl });
    }
    return neonPoolInstance;
}
async function initDb() {
    if (dbInitialized)
        return;
    const schemaPath = path_1.default.join(process.cwd(), "src", "lib", "schema.sql");
    const schemaSql = fs_1.default.readFileSync(schemaPath, "utf-8");
    const pool = getNeonPool();
    if (pool) {
        await pool.query(schemaSql);
    }
    else {
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
        }
        else {
            await getPglite().query(insertSql, insertParams);
        }
    }
}
async function query(sqlText, params = []) {
    if (!dbInitialized) {
        await initDb();
    }
    const pool = getNeonPool();
    if (pool) {
        const res = await pool.query(sqlText, params);
        return { rows: res.rows };
    }
    const pglite = getPglite();
    const res = await pglite.query(sqlText, params);
    return { rows: res.rows };
}
