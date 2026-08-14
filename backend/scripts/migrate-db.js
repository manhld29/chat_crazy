const { execSync } = require("child_process");
const path = require("path");

// Load .env from backend directory if present
try {
  require("dotenv").config({ path: path.join(__dirname, "../.env") });
} catch (e) {
  // Ignore if dotenv is not available or env vars are injected directly
}

function runMigration() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl || dbUrl.trim() === "") {
    console.log(
      "ℹ️ [Migration] DATABASE_URL is not set. Skipping database migration."
    );
    return;
  }

  console.log(
    `🚀 [Migration] Executing Prisma database migrations against PostgreSQL / Xata.io...`
  );

  try {
    execSync("npx prisma migrate deploy", {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
    });
    console.log(
      "✅ [Migration] Database schema migrations applied successfully!"
    );
  } catch (error) {
    console.error("❌ [Migration] Database migration failed:", error.message);
    if (process.env.VERCEL || process.env.APP_ENV === "production") {
      console.error(
        "💥 Aborting build due to failed migration on production/Vercel."
      );
      process.exit(1);
    }
  }
}

runMigration();
