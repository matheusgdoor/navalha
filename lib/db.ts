import { Pool, type PoolClient, type QueryResultRow } from "pg";

const globalDb = globalThis as unknown as { navalhaPool?: Pool };
export const db =
  globalDb.navalhaPool ??
  new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
if (process.env.NODE_ENV !== "production") globalDb.navalhaPool = db;

export async function query<T extends QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  return db.query<T>(text, values);
}
export async function transaction<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
