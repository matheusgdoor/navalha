const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const localEnvironment = path.join(__dirname, "..", ".env.local");
for (const line of (fs.existsSync(localEnvironment)
  ? fs.readFileSync(localEnvironment, "utf8")
  : ""
).split(/\r?\n/)) {
  const index = line.indexOf("=");
  if (index > 0 && !line.startsWith("#") && !process.env[line.slice(0, index)])
    process.env[line.slice(0, index)] = line.slice(index + 1);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não informada");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const directory = path.join(__dirname, "..", "db");
    for (const file of fs
      .readdirSync(directory)
      .filter((item) => item.endsWith(".sql"))
      .sort()) {
      await pool.query(fs.readFileSync(path.join(directory, file), "utf8"));
      console.log("Migração aplicada:", file);
    }
  } finally {
    await pool.end();
  }
}
main().catch((error) => {
  console.error("Falha nas migrações:", {
    name: error?.name,
    message: error?.message || "Erro sem mensagem",
    code: error?.code,
    detail: error?.detail,
    cause: error?.cause?.message,
    errors: Array.isArray(error?.errors)
      ? error.errors.map((item) => ({
          message: item?.message,
          code: item?.code,
          address: item?.address,
          port: item?.port,
        }))
      : undefined,
  });
  process.exit(1);
});
