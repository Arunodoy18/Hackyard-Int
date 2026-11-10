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

const LANGCOL = { Java: "#ef4444", TypeScript: "#fbbf24", JavaScript: "#f7c948", Python: "#a855f7", HTML: "#ff7849", CSS: "#4fa3d9", Kotlin: "#a97bff", Go: "#22d3ee", Rust: "#f97316", C: "#94a3b8", "C++": "#f472b6", "C#": "#34d399", Swift: "#fb923c", PHP: "#818cf8", Ruby: "#f43f5e", Shell: "#4ade80", Dart: "#38bdf8" };
const lcol = (l) => LANGCOL[l] || "#e11d3f";
const RED = "#e11d3f", GOLD = "#fbbf24";

const P = {
  star: '<path d="M12 2.5l3 6.4 7 .8-5.2 4.8 1.5 6.9L12 17.9 5.7 21.4l1.5-6.9L2 9.7l7-.8z"/>',
  fork: '<circle cx="6" cy="5" r="2.5"/><circle cx="18" cy="5" r="2.5"/><circle cx="12" cy="19" r="2.5"/><path d="M6 7.5v1.5a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7.5M12 12v4.5"/>',
  commit: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.6"/>',
  code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  bars: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  repo: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 8h8M8 12h8M8 16h4"/>',
  pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  pr: '<circle cx="6" cy="5.5" r="2.5"/><circle cx="6" cy="18.5" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="M6 8v8M18 16V9a3 3 0 0 0-3-3h-3"/>',
  push: '<circle cx="12" cy="12" r="3"/><path d="M3 12h6M15 12h6"/>',
  dot: '<circle cx="12" cy="12" r="3"/>',
  pin: '<path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
};
const GH = '<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/>';
// icon helper: draws an outline icon with its top-left at (x, y)
const ic = (name, x, y, size, color, sw = 2) => `<g transform="translate(${x} ${y}) scale(${size / 24})" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${P[name]}</g>`;

const W = 1100, H = 600;
const panel = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="url(#pn)" stroke="${RED}" stroke-opacity=".28"/>`;
const title = (x, y, name, t, link) => `${ic(name, x + 20, y + 20, 22, RED)}<text x="${x + 54}" y="${y + 38}" font-size="17" font-weight="600" fill="#f6f6f7">${esc(t)}</text>${link ? `<text x="${x + link.w - 20}" y="${y + 37}" font-size="12.5" fill="${GOLD}" text-anchor="end">${esc(link.t)} →</text>` : ""}`;

function describeIcon(e) {
  const t = e.type;
  return t === "PushEvent" ? "push" : t === "PullRequestEvent" ? "pr" : t === "CreateEvent" ? "repo" : t === "WatchEvent" ? "star" : t === "ForkEvent" ? "fork" : "dot";
}

function build(u, repos, events, avatar) {
  const own = repos.filter((r) => !r.fork);
  const stars = own.reduce((a, r) => a + r.stargazers_count, 0);
  const forks = own.reduce((a, r) => a + r.forks_count, 0);
  const active = new Set(events.map((e) => e.repo.name)).size;
  const lc = {};
  own.forEach((r) => r.language && (lc[r.language] = (lc[r.language] || 0) + 1));
  let ls = Object.entries(lc).sort((a, b) => b[1] - a[1]);
  const total = ls.reduce((a, x) => a + x[1], 0);
  const langCount = ls.length;
  if (ls.length > 5) { const rest = ls.slice(5).reduce((a, x) => a + x[1], 0); ls = [...ls.slice(0, 5), ["Others", rest]]; }
  const LC = ["#e11d3f", "#fbbf24", "#f97316", "#a855f7", "#ff5c7a"];
  const col = (n, i) => (n === "Others" ? "#5b5b66" : LC[i]);
  const top = pickTop(repos);
  const seen = new Set();
  const acts = events.map((e) => ({ e, t: describe(e, u.login) })).filter((x) => x.t && !seen.has(x.t) && seen.add(x.t)).slice(0, 4);

  const L = 20, T = 20, LW = 300, PH = 560, cx = L + LW / 2;
  const c1 = 336, w1 = 440, c2 = 792, w2 = 288;
  const r1 = 20, h1 = 210, r2 = 246, h2 = 334;

  // ----- profile -----
  const bio = wrap(u.bio, 34, 4);
  const site = u.blog ? u.blog.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "") : "";
  const metas = [];
  if (u.location) metas.push(["pin", cut(u.location, 26)]);
  if (site) metas.push(["link", cut(site, 26)]);
  const metaSvg = metas.map(([n, t], i) => {
    const y = 392 + i * 24, tw = t.length * 6.6, x0 = cx - (tw + 22) / 2;
    return `${ic(n, x0, y - 13, 15, RED)}<text x="${x0 + 22}" y="${y}" font-size="13" fill="#d4d4d8">${esc(t)}</text>`;
  }).join("");
  const nums = [[u.public_repos, "Repos"], [u.followers, "Followers"], [u.following, "Following"]].map(([n, l], i) => {
    const colw = (LW - 40) / 3, x = L + 20 + colw / 2 + i * colw;
    return `${i ? `<line x1="${L + 20 + i * colw}" x2="${L + 20 + i * colw}" y1="476" y2="518" stroke="#fff" stroke-opacity=".08"/>` : ""}<text x="${x}" y="497" font-size="25" font-weight="700" fill="${GOLD}" text-anchor="middle">${Number(n).toLocaleString("en-US")}</text><text x="${x}" y="517" font-size="13" fill="#d4d4d8" text-anchor="middle">${l}</text>`;
  }).join("");

  // ----- stat tiles -----
  const tiles = [["star", GOLD, stars, "Total Stars"], ["fork", RED, forks, "Total Forks"], ["commit", GOLD, u._commits ?? events.filter((e) => e.type === "PushEvent").length, u._commits == null ? "Recent Updates" : "Commits"], ["code", RED, active, "Active Repos"]];
  const tw = (w1 - 40 - 30) / 4;
  const tileSvg = tiles.map(([n, c, v, l], i) => {
    const x = c1 + 20 + i * (tw + 10), y = r1 + 64;
    return `<rect x="${x}" y="${y}" width="${tw}" height="116" rx="14" fill="#fff" fill-opacity=".03" stroke="${RED}" stroke-opacity=".28"/>${ic(n, x + tw / 2 - 12, y + 16, 24, c)}<text x="${x + tw / 2}" y="${y + 72}" font-size="26" font-weight="700" fill="#f6f6f7" text-anchor="middle">${Number(v).toLocaleString("en-US")}</text><text x="${x + tw / 2}" y="${y + 96}" font-size="12" fill="#d4d4d8" text-anchor="middle">${l}</text>`;
  }).join("");

  // ----- languages -----
  const R = 44, C = 2 * Math.PI * R, dcx = c2 + 70, dcy = r1 + 130;
  let off = 0;
  const arcs = total ? ls.map(([n, c], i) => {
    const len = (c / total) * C;
    const a = `<circle cx="${dcx}" cy="${dcy}" r="${R}" fill="none" stroke="${col(n, i)}" stroke-width="17" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 ${dcx} ${dcy})"/>`;
    off += len; return a;
  }).join("") : "";
  const legend = ls.map(([n, c], i) => {
    const y = r1 + 84 + i * 22;
    return `<circle cx="${c2 + 144}" cy="${y - 4}" r="5" fill="${col(n, i)}"/><text x="${c2 + 158}" y="${y}" font-size="12.5" fill="#f6f6f7">${esc(cut(n, 11))}</text><text x="${c2 + w2 - 18}" y="${y}" font-size="12.5" fill="#d4d4d8" text-anchor="end">${(c / total * 100).toFixed(1)}%</text>`;
  }).join("");

  // ----- repos -----
  const repoSvg = top.map((r, i) => {
    const y = r2 + 70 + i * 86, c = lcol(r.language);
    const desc = wrap(r.description || `${r.language} project, updated ${new Date(r.pushed_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`, 27, 2);
    const tagW = 78, tagX = c1 + w1 - 20 - tagW, forkX = tagX - 50, starX = forkX - 50;
    return `${i ? `<line x1="${c1 + 20}" x2="${c1 + w1 - 20}" y1="${y - 14}" y2="${y - 14}" stroke="#fff" stroke-opacity=".07"/>` : ""}
      <rect x="${c1 + 20}" y="${y + 6}" width="40" height="40" rx="11" fill="#fff" fill-opacity=".06"/>${ic("repo", c1 + 29, y + 15, 22, "#d4d4d8", 1.8)}
      <text x="${c1 + 74}" y="${y + 18}" font-size="15.5" font-weight="600" fill="#f6f6f7">${esc(cut(r.name, 20))}</text>
      ${desc.map((l, k) => `<text x="${c1 + 74}" y="${y + 36 + k * 16}" font-size="12" fill="#a3a3ac">${esc(l)}</text>`).join("")}
      ${ic("star", starX, y + 14, 16, GOLD, 1.8)}<text x="${starX + 21}" y="${y + 27}" font-size="13.5" fill="#e4e4e7">${r.stargazers_count}</text>
      ${ic("fork", forkX, y + 14, 16, RED, 1.8)}<text x="${forkX + 21}" y="${y + 27}" font-size="13.5" fill="#e4e4e7">${r.forks_count}</text>
      <rect x="${tagX}" y="${y + 11}" width="${tagW}" height="24" rx="12" fill="${c}" fill-opacity=".16"/><text x="${tagX + tagW / 2}" y="${y + 27}" font-size="12" fill="${c}" text-anchor="middle">${esc(cut(r.language, 10))}</text>`;
  }).join("") || `<text x="${c1 + 22}" y="${r2 + 90}" font-size="13" fill="#a3a3ac">No public repositories yet.</text>`;

  // ----- activity -----
  const actSvg = acts.map((x, i) => {
    const y = r2 + 94 + i * 62, last = i === acts.length - 1;
    return `${!last ? `<line x1="${c2 + 24}" x2="${c2 + 24}" y1="${y}" y2="${y + 62}" stroke="${RED}" stroke-opacity=".4"/>` : ""}
      <circle cx="${c2 + 24}" cy="${y}" r="4.5" fill="${last ? GOLD : RED}"/>
      <circle cx="${c2 + 58}" cy="${y}" r="19" fill="#fff" fill-opacity=".06"/>${ic(describeIcon(x.e), c2 + 49, y - 9, 18, "#d4d4d8", 1.9)}
      <text x="${c2 + 86}" y="${y - 2}" font-size="12.5" fill="#f1f1f3">${esc(cut(x.t, 27))}</text>
      <text x="${c2 + 86}" y="${y + 15}" font-size="11" fill="#a3a3ac">${ago(x.e.created_at)}</text>`;
  }).join("") || `<text x="${c2 + 22}" y="${r2 + 90}" font-size="13" fill="#a3a3ac">No recent public activity.</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}" role="img" aria-label="Builder Card for ${esc(u.name || u.login)}">
  <defs>
    <radialGradient id="g1" cx="0" cy="0" r="1" gradientTransform="translate(0 0) scale(620 330)" gradientUnits="userSpaceOnUse"><stop stop-color="${RED}" stop-opacity=".30"/><stop offset="1" stop-color="${RED}" stop-opacity="0"/></radialGradient>
    <radialGradient id="g2" cx="0" cy="0" r="1" gradientTransform="translate(${W} ${H}) scale(560 300)" gradientUnits="userSpaceOnUse"><stop stop-color="${RED}" stop-opacity=".24"/><stop offset="1" stop-color="${RED}" stop-opacity="0"/></radialGradient>
    <linearGradient id="pn" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#1d0d11"/><stop offset="1" stop-color="#110809"/></linearGradient>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ff2a55"/><stop offset="1" stop-color="#c8102e"/></linearGradient>
    <linearGradient id="sw1" x1="0" x2="1"><stop stop-color="${RED}" stop-opacity="0"/><stop offset=".5" stop-color="${RED}" stop-opacity=".5"/><stop offset="1" stop-color="${RED}" stop-opacity="0"/></linearGradient>
    <linearGradient id="sw2" x1="0" x2="1"><stop stop-color="${GOLD}" stop-opacity="0"/><stop offset="1" stop-color="${GOLD}" stop-opacity=".45"/></linearGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>
    <clipPath id="av"><circle cx="${cx}" cy="120" r="60"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" rx="28" fill="#0c0708"/>
  <rect width="${W}" height="${H}" rx="28" fill="url(#g1)"/>
  <rect width="${W}" height="${H}" rx="28" fill="url(#g2)"/>
  <path d="M-10 90 C 120 20, 260 10, 340 80" fill="none" stroke="url(#sw1)" stroke-width="2.5"/>
  <path d="M760 ${H - 30} C 900 ${H - 60}, 1000 ${H - 140}, ${W + 10} ${H - 200}" fill="none" stroke="url(#sw2)" stroke-width="2.5"/>
  <rect x=".75" y=".75" width="${W - 1.5}" height="${H - 1.5}" rx="28" fill="none" stroke="${RED}" stroke-opacity=".38" stroke-width="1.5"/>

  ${panel(L, T, LW, PH)}
  <circle cx="${cx}" cy="120" r="64" fill="${RED}" opacity=".45" filter="url(#glow)"/>
  <circle cx="${cx}" cy="120" r="66" fill="none" stroke="url(#ring)" stroke-width="3.5"/>
  ${avatar ? `<image href="${avatar}" x="${cx - 60}" y="60" width="120" height="120" clip-path="url(#av)" preserveAspectRatio="xMidYMid slice"/>` : `<circle cx="${cx}" cy="120" r="60" fill="#1d1d22"/>`}
  <circle cx="${cx + 46}" cy="${120 + 50}" r="19" fill="#0c0708" stroke="${RED}" stroke-width="2"/>
  <g transform="translate(${cx + 46 - 11} ${120 + 50 - 11}) scale(1.375)" fill="#fff">${GH}</g>
  <text x="${cx}" y="236" font-size="24" font-weight="700" fill="#f6f6f7" text-anchor="middle">${esc(cut(u.name || u.login, 22))}</text>
  <text x="${cx}" y="259" font-size="14.5" fill="#b4b4bc" text-anchor="middle">@${esc(u.login)}</text>
  ${bio.map((l, i) => `<text x="${cx}" y="${298 + i * 20}" font-size="13.5" fill="#e4e4e7" text-anchor="middle">${esc(l)}</text>`).join("")}
  ${metaSvg}
  ${nums}
  <text x="${cx}" y="556" font-size="12.5" fill="${GOLD}" text-anchor="middle">github.com/${esc(u.login)}</text>

  ${panel(c1, r1, w1, h1)}${title(c1, r1, "bars", "GitHub Stats")}${tileSvg}
  ${panel(c2, r1, w2, h1)}${title(c2, r1, "layers", "Top Languages")}
  ${arcs}
  <text x="${dcx}" y="${dcy + 2}" font-size="22" font-weight="700" fill="#f6f6f7" text-anchor="middle">${langCount}</text>
  <text x="${dcx}" y="${dcy + 17}" font-size="10" fill="#d4d4d8" text-anchor="middle">Languages</text>
  ${legend}

  ${panel(c1, r2, w1, h2)}${title(c1, r2, "repo", "Top Repositories", { t: "View All", w: w1 })}${repoSvg}
  ${panel(c2, r2, w2, h2)}${title(c2, r2, "pulse", "Recent Activity")}${actSvg}
</svg>`;
}

function errorSvg(msg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="140" viewBox="0 0 1100 140" font-family="${FONT}"><rect width="1100" height="140" rx="26" fill="#0b0b0d"/><text x="550" y="76" font-size="20" fill="#f5f5f6" text-anchor="middle">${esc(msg)}</text></svg>`;
}

module.exports = async (req, res) => {
  const name = String(new URL(req.url, "http://x").searchParams.get("u") || "").trim().replace(/^@/, "");
  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  if (!/^[a-z\d](?:[a-z\d-]{0,38})$/i.test(name)) {
    res.statusCode = 400;
    return res.end(errorSvg("Add a GitHub username: /api/card?u=username"));
  }
  try {
    const [u, repos, events, cm] = await Promise.all([
      gh("/users/" + name),
      gh(`/users/${name}/repos?per_page=100&sort=pushed`),
      gh(`/users/${name}/events/public?per_page=100`),
      gh(`/search/commits?q=author:${encodeURIComponent(name)}&per_page=1`).catch(() => null),
    ]);
    u._commits = cm && typeof cm.total_count === "number" ? cm.total_count : null;
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
