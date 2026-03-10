const { Client } = require("pg");

async function main() {
  const client = new Client({
    connectionString:
      "postgresql://postgres:Hazelvanmierlo1893%40@db.szrnjukvqhftvhxvukwb.supabase.co:5432/postgres",
  });

  await client.connect();

  const check = await client.query(
    "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'verification_tokens')"
  );

  if (check.rows[0].exists) {
    console.log("verification_tokens table already exists");
  } else {
    await client.query(`
      CREATE TABLE verification_tokens (
        identifier TEXT NOT NULL,
        token TEXT NOT NULL,
        expires TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX idx_vt_identifier ON verification_tokens(identifier);
      CREATE INDEX idx_vt_token ON verification_tokens(token);
      ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;
    `);
    console.log("Created verification_tokens table");
  }

  await client.end();
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
