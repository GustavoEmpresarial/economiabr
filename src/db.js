const { Pool } = require("pg");

function resolveConnectionString() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const dbName = process.env.POSTGRES_DB;
  const host = process.env.POSTGRES_HOST || "db";
  const port = process.env.POSTGRES_PORT || "5432";

  if (user && password && dbName) {
    return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${dbName}`;
  }

  return "";
}

const connectionString = resolveConnectionString();

if (!connectionString) {
  throw new Error(
    "DATABASE_URL nao configurado (ou POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB incompletos)"
  );
}

const db = new Pool({ connectionString });

// Mantem o schema minimo da aplicacao no boot.
async function initDb() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      excerpt TEXT,
      content_html TEXT NOT NULL,
      content_markdown TEXT,
      image_url TEXT,
      tags TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      published_at TIMESTAMPTZ NOT NULL
    );
  `);
}

module.exports = { db, initDb };
