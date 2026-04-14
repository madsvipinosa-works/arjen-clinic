// scripts/run-migration.js
// Universal Supabase migration runner.
// Usage: node scripts/run-migration.js <path-to-sql-file>
const https = require("https");
const fs    = require("fs");
const path  = require("path");

const PROJECT_REF  = "vigqhnvaoszcffqvqmsg";
const ACCESS_TOKEN = "sbp_590dc132d7a26ceabe991cfe70047dc358d1301e";

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error("Usage: node scripts/run-migration.js <path-to-sql-file>");
  process.exit(1);
}

const sqlPath = path.resolve(process.cwd(), sqlFile);
if (!fs.existsSync(sqlPath)) {
  console.error(`File not found: ${sqlPath}`);
  process.exit(1);
}

const sql  = fs.readFileSync(sqlPath, "utf-8");
const body = JSON.stringify({ query: sql });

console.log(`Running migration: ${sqlFile}`);

const options = {
  hostname: "api.supabase.com",
  path:     `/v1/projects/${PROJECT_REF}/database/query`,
  method:   "POST",
  headers: {
    Authorization:   `Bearer ${ACCESS_TOKEN}`,
    "Content-Type":  "application/json",
    "Content-Length": Buffer.byteLength(body),
  },
};

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    console.log(`Status: ${res.statusCode}`);
    try {
      const json = JSON.parse(data);
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log("✅ Migration succeeded!");
      } else {
        console.error("❌ Migration failed:");
        console.error(JSON.stringify(json, null, 2));
      }
    } catch {
      console.log("Raw response:", data);
    }
  });
});

req.on("error", (e) => console.error("Request error:", e.message));
req.write(body);
req.end();
