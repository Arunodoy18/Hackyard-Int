// Builder Card as a single SVG image, so it can be used in a GitHub README.
// Usage: /api/card?u=<github-username>

const DAY = 864e5;
const COLORS = ["#d4264a", "#e6b94d", "#f08a4b", "#9b6bd6", "#4fa3d9", "#5b5b66"];
const FONT = "Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cut = (t, n) => (t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t);
const wrap = (text, width, maxLines) => {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > width) { lines.push(line); line = w; } else line = (line + " " + w).trim();
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = cut(lines[maxLines - 1] + "…", width); }
  return lines;
};
const ago = (d) => {
  const s = (Date.now() - new Date(d)) / 1e3;
  for (const [n, l] of [[86400, "day"], [3600, "hour"], [60, "minute"]]) if (s >= n) { const v = Math.floor(s / n); return v + " " + l + (v > 1 ? "s" : "") + " ago"; }
  return "Just now";
};

async function gh(path) {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "builder-card" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = "Bearer " + process.env.GITHUB_TOKEN;
  const r = await fetch("https://api.github.com" + path, { headers });
  if (r.status === 404) { const e = new Error("User not found"); e.code = 404; throw e; }
  if (!r.ok) { const e = new Error("GitHub is busy. Try again soon."); e.code = 503; throw e; }
  return r.json();
}

const FEATURED = { arunodoy18: ["NutTrack", "Cadence", "TheZone"] };
function pickTop(repos) {
  const pinned = FEATURED[(repos[0]?.owner.login || "").toLowerCase()];
  if (pinned) { const m = pinned.map((n) => repos.find((r) => r.name === n)).filter(Boolean); if (m.length) return m; }
  const score = (r) => new Date(r.pushed_at).getTime() + r.stargazers_count * 14 * DAY;
  return repos
    .filter((r) => !r.fork && !r.archived && r.language && r.name.toLowerCase() !== r.owner.login.toLowerCase())
    .sort((a, b) => score(b) - score(a))
    .slice(0, 3);
}

function describe(e, login) {
  const full = e.repo.name;
  const repo = full.toLowerCase().startsWith(login.toLowerCase() + "/") ? full.split("/")[1] : full;
  const p = e.payload || {};
  switch (e.type) {
    case "PushEvent": return `Pushed updates to ${repo}`;
    case "PullRequestEvent": return p.pull_request?.merged ? `Merged a pull request in ${repo}` : p.action === "opened" ? `Opened a pull request in ${repo}` : `Updated a pull request in ${repo}`;
    case "CreateEvent": return p.ref_type === "repository" ? `Created ${repo}` : `Created a ${p.ref_type} in ${repo}`;
    case "IssuesEvent": return `${p.action === "opened" ? "Opened" : "Updated"} an issue in ${repo}`;
    case "WatchEvent": return `Starred ${repo}`;
    case "ForkEvent": return `Forked ${repo}`;
    case "IssueCommentEvent": case "PullRequestReviewEvent": case "PullRequestReviewCommentEvent": return `Joined a discussion in ${repo}`;
    case "ReleaseEvent": return `Published a release in ${repo}`;
    default: return null;
  }
}

const label = (x, y, t) => `<text x="${x}" y="${y}" font-size="11" font-weight="600" letter-spacing="1.4" fill="#9a9aa3">${esc(t.toUpperCase())}</text>`;
const panel = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#131316" stroke="#ffffff" stroke-opacity=".08"/>`;

function build(u, repos, events, avatar) {
  const own = repos.filter((r) => !r.fork);
  const stars = own.reduce((a, r) => a + r.stargazers_count, 0);
  const forks = own.reduce((a, r) => a + r.forks_count, 0);
  const updates = events.filter((e) => e.type === "PushEvent").length;
  const lc = {};
  own.forEach((r) => r.language && (lc[r.language] = (lc[r.language] || 0) + 1));
  let ls = Object.entries(lc).sort((a, b) => b[1] - a[1]);
  const total = ls.reduce((a, x) => a + x[1], 0);
  const langCount = ls.length;
  if (ls.length > 5) { const rest = ls.slice(5).reduce((a, x) => a + x[1], 0); ls = [...ls.slice(0, 5), ["Others", rest]]; }
  const top = pickTop(repos);
  const seen = new Set();
  const acts = events.map((e) => ({ e, t: describe(e, u.login) })).filter((x) => x.t && !seen.has(x.t) && seen.add(x.t)).slice(0, 4);

  const L = 24, T = 24, LW = 290, H = 492;           // left panel
  const cx = L + LW / 2;
  const c1 = 338, c2 = 665, cw = 311;                  // right columns
  const r1 = 24, h1 = 200, r2 = 240, h2 = 276;         // right rows

  const bio = wrap(u.bio, 32, 4);
  const site = u.blog ? u.blog.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "") : "";
  const place = [u.location, site].filter(Boolean).map((s) => cut(s, 30));

  // donut
  const R = 40, C = 2 * Math.PI * R;
  let off = 0;
  const arcs = total ? ls.map(([, n], i) => {
    const len = (n / total) * C;
    const a = `<circle cx="${c2 + 70}" cy="${r1 + 118}" r="${R}" fill="none" stroke="${COLORS[i]}" stroke-width="15" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 ${c2 + 70} ${r1 + 118})"/>`;
    off += len; return a;
  }).join("") : "";
  const legend = ls.map(([n, c], i) => `<circle cx="${c2 + 148}" cy="${r1 + 70 + i * 22}" r="4.5" fill="${COLORS[i]}"/><text x="${c2 + 162}" y="${r1 + 74 + i * 22}" font-size="13" fill="#f5f5f6">${esc(cut(n, 12))}</text><text x="${c2 + cw - 20}" y="${r1 + 74 + i * 22}" font-size="13" fill="#9a9aa3" text-anchor="end">${Math.round((c / total) * 100)}%</text>`).join("");

  const stat = (x, y, n, l) => `<text x="${x}" y="${y}" font-size="28" font-weight="700" fill="#f5f5f6">${n.toLocaleString("en-US")}</text><text x="${x}" y="${y + 20}" font-size="12" fill="#9a9aa3">${esc(l)}</text>`;

  const projects = top.map((r, i) => {
    const y = r2 + 68 + i * 66;
    const desc = r.description || `${r.language} project, updated ${new Date(r.pushed_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
    return `${i ? `<line x1="${c1 + 22}" x2="${c1 + cw - 22}" y1="${y - 22}" y2="${y - 22}" stroke="#ffffff" stroke-opacity=".08"/>` : ""}
      <text x="${c1 + 22}" y="${y}" font-size="15" font-weight="600" fill="#f5f5f6">${esc(cut(r.name, 18))}</text>
      <text x="${c1 + 22}" y="${y + 20}" font-size="12" fill="#9a9aa3">${esc(cut(desc, 40))}</text>
      <text x="${c1 + cw - 22}" y="${y}" font-size="12" font-weight="500" fill="#f5f5f6" text-anchor="end">${esc(r.language)}</text>
      <text x="${c1 + cw - 22}" y="${y + 20}" font-size="12" fill="#e6b94d" text-anchor="end">★ ${r.stargazers_count}</text>`;
  }).join("") || `<text x="${c1 + 22}" y="${r2 + 76}" font-size="13" fill="#9a9aa3">No public projects yet.</text>`;

  const activity = acts.map((x, i) => {
    const y = r2 + 70 + i * 50;
    return `<circle cx="${c2 + 26}" cy="${y - 4}" r="4" fill="#d4264a"/>${i < acts.length - 1 ? `<line x1="${c2 + 26}" x2="${c2 + 26}" y1="${y + 3}" y2="${y + 46}" stroke="#ffffff" stroke-opacity=".1"/>` : ""}
      <text x="${c2 + 42}" y="${y}" font-size="13" fill="#e6e6ea">${esc(cut(x.t, 34))}</text>
      <text x="${c2 + 42}" y="${y + 17}" font-size="11" fill="#9a9aa3">${ago(x.e.created_at)}</text>`;
  }).join("") || `<text x="${c2 + 22}" y="${r2 + 76}" font-size="13" fill="#9a9aa3">No recent public activity.</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="540" viewBox="0 0 1000 540" font-family="${FONT}" role="img" aria-label="Builder Card for ${esc(u.name || u.login)}">
  <defs>
    <radialGradient id="g1" cx="0" cy="0" r="1" gradientTransform="translate(90 0) scale(520 260)" gradientUnits="userSpaceOnUse"><stop stop-color="#d4264a" stop-opacity=".28"/><stop offset="1" stop-color="#d4264a" stop-opacity="0"/></radialGradient>
    <radialGradient id="g2" cx="0" cy="0" r="1" gradientTransform="translate(1000 0) scale(460 230)" gradientUnits="userSpaceOnUse"><stop stop-color="#e6b94d" stop-opacity=".16"/><stop offset="1" stop-color="#e6b94d" stop-opacity="0"/></radialGradient>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d4264a"/><stop offset="1" stop-color="#e6b94d"/></linearGradient>
    <linearGradient id="lp" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d4264a" stop-opacity=".14"/><stop offset=".5" stop-color="#d4264a" stop-opacity="0"/></linearGradient>
    <clipPath id="av"><circle cx="${cx}" cy="112" r="55"/></clipPath>
  </defs>
  <rect width="1000" height="540" rx="26" fill="#0b0b0d"/>
  <rect width="1000" height="540" rx="26" fill="url(#g1)"/>
  <rect width="1000" height="540" rx="26" fill="url(#g2)"/>

  ${panel(L, T, LW, H)}
  <rect x="${L}" y="${T}" width="${LW}" height="${H}" rx="18" fill="url(#lp)"/>
  <circle cx="${cx}" cy="112" r="60" fill="none" stroke="url(#ring)" stroke-width="3"/>
  ${avatar ? `<image href="${avatar}" x="${cx - 55}" y="57" width="110" height="110" clip-path="url(#av)" preserveAspectRatio="xMidYMid slice"/>` : `<circle cx="${cx}" cy="112" r="55" fill="#1d1d22"/>`}
  <text x="${cx}" y="206" font-size="22" font-weight="700" fill="#f5f5f6" text-anchor="middle">${esc(cut(u.name || u.login, 22))}</text>
  <text x="${cx}" y="228" font-size="14" fill="#e6b94d" text-anchor="middle">@${esc(u.login)}</text>
  ${bio.map((l, i) => `<text x="${cx}" y="${262 + i * 19}" font-size="13" fill="#cfcfd6" text-anchor="middle">${esc(l)}</text>`).join("")}
  ${place.map((l, i) => `<text x="${cx}" y="${358 + i * 18}" font-size="12" fill="#9a9aa3" text-anchor="middle">${esc(l)}</text>`).join("")}
  <line x1="${L + 24}" x2="${L + LW - 24}" y1="400" y2="400" stroke="#ffffff" stroke-opacity=".08"/>
  <line x1="${L + 24}" x2="${L + LW - 24}" y1="470" y2="470" stroke="#ffffff" stroke-opacity=".08"/>
  ${[[u.public_repos, "Projects"], [u.followers, "Followers"], [u.following, "Following"]].map(([n, l], i) => {
    const x = L + 24 + (LW - 48) / 6 + i * ((LW - 48) / 3);
    return `<text x="${x}" y="432" font-size="20" font-weight="700" fill="#f5f5f6" text-anchor="middle">${Number(n).toLocaleString("en-US")}</text><text x="${x}" y="452" font-size="12" fill="#9a9aa3" text-anchor="middle">${l}</text>`;
  }).join("")}
  <text x="${cx}" y="495" font-size="12" fill="#9a9aa3" text-anchor="middle">github.com/${esc(u.login)}</text>

  ${panel(c1, r1, cw, h1)}${label(c1 + 22, r1 + 36, "At a glance")}
  ${stat(c1 + 22, r1 + 84, stars, "Stars earned")}${stat(c1 + 170, r1 + 84, forks, "Times forked")}
  ${stat(c1 + 22, r1 + 152, updates, "Recent updates")}${stat(c1 + 170, r1 + 152, langCount, "Languages used")}

  ${panel(c2, r1, cw, h1)}${label(c2 + 22, r1 + 36, "Main languages")}
  ${arcs}
  <text x="${c2 + 70}" y="${r1 + 120}" font-size="20" font-weight="700" fill="#f5f5f6" text-anchor="middle">${langCount}</text>
  <text x="${c2 + 70}" y="${r1 + 134}" font-size="9" fill="#9a9aa3" text-anchor="middle">Languages</text>
  ${legend}

  ${panel(c1, r2, cw, h2)}${label(c1 + 22, r2 + 36, "Top projects")}${projects}
  ${panel(c2, r2, cw, h2)}${label(c2 + 22, r2 + 36, "Recent activity")}${activity}
</svg>`;
}

function errorSvg(msg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="140" viewBox="0 0 1000 140" font-family="${FONT}"><rect width="1000" height="140" rx="26" fill="#0b0b0d"/><text x="500" y="76" font-size="20" fill="#f5f5f6" text-anchor="middle">${esc(msg)}</text></svg>`;
}

module.exports = async (req, res) => {
  const name = String(new URL(req.url, "http://x").searchParams.get("u") || "").trim().replace(/^@/, "");
  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  if (!/^[a-z\d](?:[a-z\d-]{0,38})$/i.test(name)) {
    res.statusCode = 400;
    return res.end(errorSvg("Add a GitHub username: /api/card?u=username"));
  }
  try {
    const [u, repos, events] = await Promise.all([
      gh("/users/" + name),
      gh(`/users/${name}/repos?per_page=100&sort=pushed`),
      gh(`/users/${name}/events/public?per_page=100`),
    ]);
    let avatar = "";
    try {
      const a = await fetch(u.avatar_url + (u.avatar_url.includes("?") ? "&" : "?") + "s=220");
      avatar = "data:" + (a.headers.get("content-type") || "image/png") + ";base64," + Buffer.from(await a.arrayBuffer()).toString("base64");
    } catch {}
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.statusCode = 200;
    res.end(build(u, repos, events, avatar));
  } catch (e) {
    res.statusCode = e.code || 500;
    res.end(errorSvg(e.code === 404 ? "We couldn't find that GitHub user." : "Couldn't load the card. Try again soon."));
  }
};
