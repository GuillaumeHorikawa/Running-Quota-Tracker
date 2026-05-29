// Running Quota Tracker — Scriptable Widget
// ─────────────────────────────────────────
// SETUP: Fill in the three values below.
// Get them by opening your web app in Safari, opening the
// console (share → "Inspect Element" or use Safari dev tools)
// and running: JSON.parse(localStorage.getItem('strava_creds'))
//
// You'll see clientId, clientSecret, and refreshToken. Paste them here.

const CLIENT_ID     = "252928";
const CLIENT_SECRET = "799af01ceb4ee88ceb2f93cab39ac9eb78dae4c4";
const REFRESH_TOKEN = "ecd7f67d620414f59c4ff1bc8cea46ba48819dbf";

// ── Config ───────────────────────────────
const QUOTA_PER_DAY = 2.5;
const START_DATE    = new Date("2026-01-01T00:00:00");
const METERS_PER_MILE = 1609.344;

// ── Token refresh ─────────────────────────
async function getAccessToken() {
  const req = new Request("https://www.strava.com/oauth/token");
  req.method = "POST";
  req.headers = { "Content-Type": "application/json" };
  req.body = JSON.stringify({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: REFRESH_TOKEN,
    grant_type: "refresh_token",
  });
  const res = await req.loadJSON();
  if (!res.access_token) throw new Error("Token refresh failed");
  return res.access_token;
}

// ── Fetch runs since Jan 1 ────────────────
async function fetchMiles(token) {
  const after = Math.floor(START_DATE.getTime() / 1000);
  let page = 1;
  let total = 0;

  while (true) {
    const req = new Request(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=200&page=${page}`
    );
    req.headers = { Authorization: `Bearer ${token}` };
    const batch = await req.loadJSON();
    if (!Array.isArray(batch) || batch.length === 0) break;

    batch.forEach(a => {
      if (a.type === "Run" || a.sport_type === "Run") {
        total += a.distance / METERS_PER_MILE;
      }
    });

    if (batch.length < 200) break;
    page++;
  }

  return total;
}

// ── Quota calculation ─────────────────────
function calcQuota() {
  const now = new Date();
  const msElapsed = now - START_DATE;
  const daysElapsed = msElapsed / (1000 * 60 * 60 * 24);
  const daysStarted = Math.floor(daysElapsed) + 1;
  return daysStarted * QUOTA_PER_DAY;
}

// ── Widget rendering ──────────────────────
function buildWidget(delta, totalMiles, quota, error) {
  const w = new ListWidget();
  w.backgroundColor = new Color("#ffffff");
  w.setPadding(16, 16, 16, 16);

  if (error) {
    const errText = w.addText("Error");
    errText.textColor = new Color("#fc4c02");
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

  // Big delta number
  const ahead = delta >= 0;
  const sign = ahead ? "+" : "−";
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

  // Updated time
  w.addSpacer(4);
  const now = new Date();
  const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const updated = w.addText(`Updated ${time}`);
  updated.textColor = new Color("#cccccc");
  updated.font = Font.systemFont(9);

  return w;
}

// ── Main ──────────────────────────────────
async function main() {
  let widget;
  try {
    const token = await getAccessToken();
    const totalMiles = await fetchMiles(token);
    const quota = calcQuota();
    const delta = totalMiles - quota;
    widget = buildWidget(delta, totalMiles, quota, null);
  } catch (e) {
    widget = buildWidget(0, 0, 0, e.message);
  }

  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    widget.presentSmall();
  }

  Script.complete();
}

await main();
