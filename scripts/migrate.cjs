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

    const platformAdmin = await pool.query(
      "SELECT EXISTS(SELECT 1 FROM platform_admins) AS exists",
    );
    if (!platformAdmin.rows[0].exists) {
      const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
      const password = process.env.ADMIN_PASSWORD;
      if (!email || !password)
        throw new Error(
          "ADMIN_EMAIL e ADMIN_PASSWORD são obrigatórios para criar o administrador inicial",
        );

      const hash = await bcrypt.hash(password, 12);
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
      await pool.query(
        `INSERT INTO platform_admins(user_id)
         VALUES($1)
         ON CONFLICT DO NOTHING`,
        [admin.rows[0].id],
      );
      console.log("Administrador inicial criado com segurança.");
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
