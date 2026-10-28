/**
 * prepare-public.cjs — runs as part of `npm run build` (before `vite build`).
 *
 * 1. Runs the Python pipeline: python3 ../scripts/build_collectdesk.py
 *    Rebuilds web/public/data/*.json from the real control catalog and the
 *    seeded artifact library, proving the shipped payloads are pipeline-generated.
 * 2. Copies data/test-vectors.json into web/public/data/ (shared contract).
 * 3. Writes web/public/data/stamp.json with repo, git sha, UTC build time.
 * 4. Exits non-zero if the pipeline produced no controls or no matches.
 */
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const WEB_DIR = path.resolve(__dirname, "..");
const ROOT_DIR = path.resolve(WEB_DIR, "..");
const PUBLIC_DATA = path.join(WEB_DIR, "public", "data");

function fail(msg) {
  console.error(`prepare-public: ${msg}`);
  process.exit(1);
}

function gitSha() {
  try {
    return execFileSync("git", ["-C", ROOT_DIR, "rev-parse", "--short", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

console.log("prepare-public: running python3 ../scripts/build_collectdesk.py ...");
try {
  execFileSync("python3", ["../scripts/build_collectdesk.py"], {
    cwd: WEB_DIR,
    stdio: "inherit",
  });
} catch (e) {
  fail(`pipeline script failed (${e && e.message ? e.message : e})`);
}

const controls = path.join(PUBLIC_DATA, "queue.json");
if (!fs.existsSync(controls)) {
  fail("queue.json missing after pipeline run");
}
const controlRows = JSON.parse(fs.readFileSync(controls, "utf8"));
if (!Array.isArray(controlRows) || controlRows.length === 0) {
  fail("queue.json is empty");
}
console.log(`prepare-public: ${controlRows.length} queue rows shipped`);

const matches = path.join(PUBLIC_DATA, "accounts.json");
if (!fs.existsSync(matches)) {
  fail("accounts.json missing after pipeline run");
}
const rows = JSON.parse(fs.readFileSync(matches, "utf8"));
if (!Array.isArray(rows) || rows.length === 0) {
  fail("accounts.json is empty");
}
console.log(`prepare-public: ${rows.length} accounts shipped`);

const vectors = path.join(ROOT_DIR, "data", "test-vectors.json");
if (!fs.existsSync(vectors)) {
  fail("data/test-vectors.json missing");
}
fs.mkdirSync(PUBLIC_DATA, { recursive: true });
fs.copyFileSync(vectors, path.join(PUBLIC_DATA, "test-vectors.json"));
console.log("prepare-public: test-vectors.json copied");

const stamp = {
  repo: "tidaaartorhem/ai-ar-collections-agent",
  sha: gitSha(),
  built_utc: new Date().toISOString(),
};
fs.writeFileSync(path.join(PUBLIC_DATA, "stamp.json"), JSON.stringify(stamp, null, 2) + "\n");
console.log(`prepare-public: stamp.json written (${stamp.sha})`);
