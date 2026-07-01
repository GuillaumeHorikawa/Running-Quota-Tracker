// Running Quota Tracker — Scriptable Widget
// ──────────────────────────────────────────
// SETUP:
// 1. Open the web app and complete setup
// 2. Copy the Gist ID shown at the bottom of the dashboard
// 3. Create a GitHub token at github.com/settings/tokens/new
//    (check "gist" scope, set no expiration) — or reuse the same one
// 4. Paste both values below

const GITHUB_TOKEN = "YOUR_GITHUB_TOKEN";
const GIST_ID      = "YOUR_GIST_ID";

// ── Config ────────────────────────────────────────────────
const QUOTA_PER_DAY = 2.5;
const START_DATE    = new Date("2026-01-01T00:00:00");
const STRAVA_MILES  = 452.5548;
const GIST_FILENAME = "running-quota.json";

// ── Fetch data from Gist ──────────────────────────────────
async function fetchRuns() {
  const req = new Request(`https://api.github.com/gists/${GIST_ID}`);
  req.headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
  };
  const gist = await req.loadJSON();
  const raw  = gist.files?.[GIST_FILENAME]?.content;
  if (!raw) throw new Error("Gist file not found");
  const data = JSON.parse(raw);
  return data.runs || [];
}

// ── Quota calculation ─────────────────────────────────────
function calcQuota() {
  const now         = new Date();
  const msElapsed   = now - START_DATE;
  const daysElapsed = msElapsed / (1000 * 60 * 60 * 24);
  const daysStarted = Math.floor(daysElapsed) + 1;
  return daysStarted * QUOTA_PER_DAY;
}

// ── Widget ────────────────────────────────────────────────
function buildWidget(delta, totalMiles, quota, runCount, error) {
  const w = new ListWidget();
  w.backgroundColor = new Color("#ffffff");
  w.setPadding(16, 16, 16, 16);

  if (error) {
    const errText = w.addText("Error");
    errText.textColor = new Color("#c0392b");
    errText.font = Font.boldSystemFont(14);
    w.addSpacer(4);
    const msg = w.addText(error);
    msg.textColor = new Color("#999999");
    msg.font = Font.systemFont(11);
    return w;
  }

  // Label
  const label = w.addText("RUNNING QUOTA");
  label.textColor = new Color("#aaaaaa");
  label.font = Font.boldMonospacedSystemFont(9);

  w.addSpacer(6);

  // Big delta
  const ahead  = delta >= 0;
  const sign   = ahead ? "+" : "−";
  const bigNum = w.addText(`${sign}${Math.abs(delta).toFixed(2)}`);
  bigNum.textColor = ahead ? new Color("#16a34a") : new Color("#fc4c02");
  bigNum.font = Font.boldSystemFont(36);
  bigNum.minimumScaleFactor = 0.6;

  // mi label
  const miLabel = w.addText(ahead ? "mi ahead" : "mi behind");
  miLabel.textColor = new Color("#aaaaaa");
  miLabel.font = Font.systemFont(11);

  w.addSpacer(8);

  // Sub stats
  const sub = w.addText(`${totalMiles.toFixed(2)} run · ${quota.toFixed(2)} due`);
  sub.textColor = new Color("#bbbbbb");
  sub.font = Font.systemFont(10);

  w.addSpacer(2);

  const countEl = w.addText(`${runCount} run${runCount !== 1 ? "s" : ""} logged since Jul 1`);
  countEl.textColor = new Color("#bbbbbb");
  countEl.font = Font.systemFont(10);

  // Updated time
  w.addSpacer(4);
  const now  = new Date();
  const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const updated = w.addText(`Updated ${time}`);
  updated.textColor = new Color("#cccccc");
  updated.font = Font.systemFont(9);

  return w;
}

// ── Main ──────────────────────────────────────────────────
async function main() {
  let widget;
  try {
    const runs       = await fetchRuns();
    const newMiles   = runs.reduce((s, r) => s + (parseFloat(r.miles) || 0), 0);
    const totalMiles = STRAVA_MILES + newMiles;
    const quota      = calcQuota();
    const delta      = totalMiles - quota;
    widget = buildWidget(delta, totalMiles, quota, runs.length, null);
  } catch (e) {
    widget = buildWidget(0, 0, 0, 0, e.message);
  }

  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    widget.presentSmall();
  }

  Script.complete();
}

await main();
