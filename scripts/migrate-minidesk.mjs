import { readFile } from "node:fs/promises";
import postgres from "postgres";

const connection = process.env.DATABASE_DIRECT_URL;
if (!connection) throw new Error("DATABASE_DIRECT_URL is required for MiniDesk migration");
const sql = postgres(connection, { max: 1, prepare: false });
try {
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(603291111)`;
    await tx`
      CREATE TABLE IF NOT EXISTS minidesk_schema_migrations (
        version integer PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    const applied = new Set(
      (await tx`SELECT version FROM minidesk_schema_migrations`).map((row) => row.version),
    );
    if (!applied.has(2)) {
      const second = await readFile(
        new URL("../server/minidesk/migrations/002_relational.sql", import.meta.url),
        "utf8",
      );
      await tx.unsafe(second);
      await tx`INSERT INTO minidesk_schema_migrations (version) VALUES (2)`;
    }
  });
  console.log("MiniDesk database migration completed");
} finally {
  await sql.end();
}
