const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const localEnvironment = path.join(__dirname, "..", ".env.local");
for (const line of (fs.existsSync(localEnvironment)
  ? fs.readFileSync(localEnvironment, "utf8")
  : ""
).split(/\r?\n/)) {
  const index = line.indexOf("=");
  if (index > 0 && !line.startsWith("#"))
    process.env[line.slice(0, index)] = line.slice(index + 1);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não informada");
  if (process.env.NODE_ENV === "production" && !process.env.ADMIN_PASSWORD)
    throw new Error("ADMIN_PASSWORD é obrigatória em produção");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const directory = path.join(__dirname, "..", "db");
    for (const file of fs
      .readdirSync(directory)
      .filter((item) => item.endsWith(".sql"))
      .sort())
      await pool.query(fs.readFileSync(path.join(directory, file), "utf8"));
    const email = (
      process.env.ADMIN_EMAIL || "admin@navalha.local"
    ).toLowerCase();
    const hash = await bcrypt.hash(
      process.env.ADMIN_PASSWORD || "Navalha@123",
      12,
    );
    const admin = await pool.query(
      `INSERT INTO users(name,email,password_hash,role)
       VALUES($1,$2,$3,'ADMIN')
       ON CONFLICT(email) DO UPDATE SET name=excluded.name,active=true
       RETURNING id`,
      [process.env.ADMIN_NAME || "Administrador", email, hash],
    );
    await pool.query(
      `INSERT INTO organization_members(organization_id,user_id,role)
       SELECT id,$1,'ADMIN' FROM organizations WHERE slug='navalha'
       ON CONFLICT DO NOTHING`,
      [admin.rows[0].id],
    );
    console.log("Banco preparado. Administrador:", email);
  } finally {
    await pool.end();
  }
}
main().catch((error) => {
  console.error("Falha ao preparar banco:", {
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
