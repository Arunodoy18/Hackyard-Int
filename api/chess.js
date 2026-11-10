// Builder Card as an animated chess game (Scholar's Mate).
// Every move reveals one fact about the developer. Works as an <img> in a GitHub README.
// Usage: /api/chess?u=<github-username>

const DAY = 864e5;
const RED = "#e11d3f", GOLD = "#fbbf24";
const FONT = "Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const SYM = "'Segoe UI Symbol','Apple Symbols','Noto Sans Symbols 2','DejaVu Sans','Arial Unicode MS',serif";

const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cut = (t, n) => (t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t);

async function gh(path) {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "builder-card" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = "Bearer " + process.env.GITHUB_TOKEN;
  const r = await fetch("https://api.github.com" + path, { headers });
  if (r.status === 404) { const e = new Error("nf"); e.code = 404; throw e; }
  if (!r.ok) { const e = new Error("gh"); e.code = 503; throw e; }
  return r.json();
}

const FEATURED = { arunodoy18: ["NutTrack", "Cadence", "TheZone"] };
function pickTop(repos, n = 3) {
  const score = (r) => new Date(r.pushed_at).getTime() + r.stargazers_count * 14 * DAY;
  const ranked = repos.filter((r) => !r.fork && !r.archived && r.language && r.name.toLowerCase() !== r.owner.login.toLowerCase()).sort((a, b) => score(b) - score(a));
  const pinned = FEATURED[(repos[0]?.owner.login || "").toLowerCase()];
  const lead = pinned ? pinned.map((nm) => repos.find((r) => r.name === nm)).filter(Boolean) : [];
  return [...lead, ...ranked.filter((r) => !lead.includes(r))].slice(0, n);
}

// ---- the game: 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6 4.Qxf7# ----
const S = 54, BX = 48, BY = 46;
const sq = (f, r) => ({ x: BX + f * S, y: BY + (8 - r) * S });
const T = 24;                                  // seconds per loop
const pct = (t) => ((t / T) * 100).toFixed(2);
const starts = [1.6, 4.3, 7.0, 9.7, 12.4, 15.1, 17.8];   // when each move begins
const MOVE = 1.0;                              // seconds a move takes
const HOLD = 22;                               // moves stay visible until here

function build(u, repos, commits, avatar) {
  const own = repos.filter((r) => !r.fork);
  const stars = own.reduce((a, r) => a + r.stargazers_count, 0);
  const forks = own.reduce((a, r) => a + r.forks_count, 0);
  const lc = {};
  own.forEach((r) => r.language && (lc[r.language] = (lc[r.language] || 0) + 1));
  const ls = Object.entries(lc).sort((a, b) => b[1] - a[1]);
  const total = ls.reduce((a, x) => a + x[1], 0);
  const top = pickTop(repos, 3);
  const name = u.name || u.login;

  const facts = [
    ["1.", "e4", `${u.public_repos.toLocaleString("en-US")} public projects built`],
    ["1…", "e5", `${u.followers.toLocaleString("en-US")} followers · ${u.following.toLocaleString("en-US")} following`],
    ["2.", "Bc4", top[0] ? `Top project: ${cut(top[0].name, 22)}` : "No public projects yet"],
    ["2…", "Nc6", ls[0] ? `${ls[0][0]} leads · ${Math.round((ls[0][1] / total) * 100)}% of repos` : "No language data yet"],
    ["3.", "Qh5", `${commits == null ? "—" : commits.toLocaleString("en-US")} commits · ${stars} stars · ${forks} forks`],
    ["3…", "Nf6", top.length > 1 ? `Also shipping: ${top.slice(1).map((r) => cut(r.name, 14)).join(" · ")}` : "Always building"],
    ["4.", "Qxf7#", `Checkmate · ${cut(name, 24)}`],
  ];

  // pieces: [glyph, color, file, rank, id]
  const back = ["♜", "♞", "♝", "♛", "♚", "♝", "♞", "♜"];
  const pieces = [];
  back.forEach((g, f) => { pieces.push([g, "w", f, 1, `w${f}1`]); pieces.push([g, "b", f, 8, `b${f}8`]); });
  for (let f = 0; f < 8; f++) { pieces.push(["♟︎", "w", f, 2, `w${f}2`]); pieces.push(["♟︎", "b", f, 7, `b${f}7`]); }

  // moves for specific piece ids: [{ply, dx, dy}] in squares (dx right, dy down on screen)
  const segs = {
    w42: [{ ply: 0, dx: 0, dy: -2 }],                       // e2-e4
    b47: [{ ply: 1, dx: 0, dy: 2 }],                        // e7-e5
    w51: [{ ply: 2, dx: -3, dy: -3 }],                      // Bf1-c4
    b18: [{ ply: 3, dx: 1, dy: 2 }],                        // Nb8-c6
    w31: [{ ply: 4, dx: 4, dy: -4 }, { ply: 6, dx: -2, dy: -2 }], // Qd1-h5, Qh5xf7
    b68: [{ ply: 5, dx: -1, dy: 2 }],                       // Ng8-f6
  };
  const captured = "b57"; // pawn on f7

  let css = "";
  let pieceSvg = "";
  const num = (n) => n.toFixed(0);

  for (const [g, side, f, r, id] of pieces) {
    const p = sq(f, r), cx = p.x + S / 2, cy = p.y + S / 2 + 14;
    const fill = side === "w" ? GOLD : RED;
    let anim = "";
    if (segs[id]) {
      let kf = "0%{transform:translate(0,0)}";
      let cx0 = 0, cy0 = 0;
      for (const sgm of segs[id]) {
        const t0 = starts[sgm.ply], t1 = t0 + MOVE;
        kf += `${pct(t0)}%{transform:translate(${num(cx0)}px,${num(cy0)}px)}`;
        cx0 += sgm.dx * S; cy0 += sgm.dy * S;
        kf += `${pct(t1)}%{transform:translate(${num(cx0)}px,${num(cy0)}px)}`;
      }
      kf += `99.6%{transform:translate(${num(cx0)}px,${num(cy0)}px)}100%{transform:translate(0,0)}`;
      css += `@keyframes k_${id}{${kf}}.a_${id}{animation:k_${id} ${T}s cubic-bezier(.5,0,.2,1) infinite}`;
      anim = `a_${id}`;
    } else if (id === captured) {
      const t = starts[6] + MOVE * 0.85;
      css += `@keyframes k_cap{0%{opacity:1}${pct(t)}%{opacity:1}${pct(t + 0.35)}%{opacity:0}99.6%{opacity:0}100%{opacity:1}}.a_cap{animation:k_cap ${T}s linear infinite}`;
      anim = "a_cap";
    }
    pieceSvg += `<g class="${anim}"${segs[id] ? ' style="will-change:transform"' : ""}><text x="${cx}" y="${cy}" font-size="38" text-anchor="middle" fill="${fill}" stroke="#12060a" stroke-width="1.4" paint-order="stroke" font-family="${SYM}">${g}</text></g>`;
  }
  // render order: moving pieces last so they travel on top
  const moving = new Set([...Object.keys(segs)]);

  // highlights (from/to squares of each ply)
  const hl = [
    [[4, 2], [4, 4]], [[4, 7], [4, 5]], [[5, 1], [2, 4]], [[1, 8], [2, 6]], [[3, 1], [7, 5]], [[6, 8], [5, 6]], [[7, 5], [5, 7]],
  ];
  let hlSvg = "";
  hl.forEach((pair, i) => {
    const t0 = starts[i], last = i === 6;
    const off = last ? HOLD : starts[i] + 2.6;
    css += `@keyframes h${i}{0%{opacity:0}${pct(t0)}%{opacity:0}${pct(t0 + 0.4)}%{opacity:1}${pct(off)}%{opacity:${last ? 1 : 0}}${pct(Math.min(off + 1.2, 23.4))}%{opacity:0}100%{opacity:0}}.h${i}{animation:h${i} ${T}s linear infinite;opacity:0}`;
    pair.forEach(([f, r]) => { const q = sq(f, r); hlSvg += `<rect class="h${i}" x="${q.x}" y="${q.y}" width="${S}" height="${S}" fill="${i % 2 ? RED : GOLD}" fill-opacity=".38"/>`; });
  });

  // move log lines
  const LX = 556, LY = 238, LH = 36;
  let logSvg = "";
  facts.forEach(([n, san, text], i) => {
    const t = starts[i] + MOVE;
    css += `@keyframes l${i}{0%{opacity:0;transform:translateX(-14px)}${pct(t - 0.05)}%{opacity:0;transform:translateX(-14px)}${pct(t + 0.5)}%{opacity:1;transform:none}${pct(HOLD)}%{opacity:1}${pct(23.2)}%{opacity:0}100%{opacity:0}}.l${i}{animation:l${i} ${T}s ease infinite;opacity:0}`;
    const y = LY + i * LH, mate = i === 6;
    logSvg += `<g class="l${i}">
      ${mate ? `<rect x="${LX - 14}" y="${y - 22}" width="506" height="32" rx="10" fill="${GOLD}" fill-opacity=".12" stroke="${GOLD}" stroke-opacity=".5"/>` : ""}
      <text x="${LX}" y="${y}" font-size="13" font-family="${MONO}" fill="#8c7a55">${n}</text>
      <text x="${LX + 34}" y="${y}" font-size="14" font-weight="600" font-family="${MONO}" fill="${GOLD}">${san}</text>
      <text x="${LX + 110}" y="${y}" font-size="15" font-weight="${mate ? 700 : 500}" fill="${mate ? "#fff" : "#ece6d6"}" font-family="${FONT}">${esc(text)}</text></g>`;
  });

  // coordinates
  let coords = "";
  for (let i = 0; i < 8; i++) {
    coords += `<text x="${BX + i * S + S / 2}" y="${BY + 8 * S + 16}" font-size="10" font-family="${MONO}" fill="#8c7a55" text-anchor="middle">${"abcdefgh"[i]}</text>`;
    coords += `<text x="${BX - 12}" y="${BY + (7 - i) * S + S / 2 + 4}" font-size="10" font-family="${MONO}" fill="#8c7a55" text-anchor="middle">${i + 1}</text>`;
  }
  // squares
  let board = "";
  for (let f = 0; f < 8; f++) for (let r = 1; r <= 8; r++) {
    const q = sq(f, r), light = (f + r) % 2 === 1;
    board += `<rect x="${q.x}" y="${q.y}" width="${S}" height="${S}" fill="${light ? "#4b1b24" : "#220a10"}"/>`;
  }
  // checkmate flash over the board
  const tm = starts[6] + MOVE;
  css += `@keyframes mate{0%{opacity:0;transform:scale(.9)}${pct(tm + 0.1)}%{opacity:0;transform:scale(.9)}${pct(tm + 0.7)}%{opacity:1;transform:scale(1)}${pct(HOLD)}%{opacity:1}${pct(23.2)}%{opacity:0}100%{opacity:0}}.mate{animation:mate ${T}s ease infinite;opacity:0;transform-origin:${BX + 4 * S}px ${BY + 4 * S}px}`;
  css += `@keyframes pulse{50%{opacity:.4}}.dot{animation:pulse 2s ease-in-out infinite}`;

  const movingFirst = pieceSvg; // pieces already contain animation wrappers
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="540" viewBox="0 0 1100 540" font-family="${FONT}" role="img" aria-label="Animated chess game revealing ${esc(name)}'s GitHub activity">
  <style>${css}</style>
  <defs>
    <radialGradient id="g1" cx="0" cy="0" r="1" gradientTransform="translate(0 0) scale(620 330)" gradientUnits="userSpaceOnUse"><stop stop-color="${RED}" stop-opacity=".30"/><stop offset="1" stop-color="${RED}" stop-opacity="0"/></radialGradient>
    <radialGradient id="g2" cx="0" cy="0" r="1" gradientTransform="translate(1100 540) scale(560 300)" gradientUnits="userSpaceOnUse"><stop stop-color="${GOLD}" stop-opacity=".16"/><stop offset="1" stop-color="${GOLD}" stop-opacity="0"/></radialGradient>
    <linearGradient id="pn" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#1d0d11"/><stop offset="1" stop-color="#110809"/></linearGradient>
    <linearGradient id="foil" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fde68a"/><stop offset=".5" stop-color="${RED}"/><stop offset="1" stop-color="${GOLD}"/></linearGradient>
    <clipPath id="av"><circle cx="590" cy="82" r="30"/></clipPath>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="8"/></filter>
  </defs>
  <rect width="1100" height="540" rx="28" fill="#0c0708"/>
  <rect width="1100" height="540" rx="28" fill="url(#g1)"/><rect width="1100" height="540" rx="28" fill="url(#g2)"/>
  <rect x=".75" y=".75" width="1098.5" height="538.5" rx="28" fill="none" stroke="url(#foil)" stroke-opacity=".5" stroke-width="1.5"/>

  <rect x="24" y="24" width="480" height="492" rx="20" fill="url(#pn)" stroke="${RED}" stroke-opacity=".3"/>
  <rect x="${BX - 4}" y="${BY - 4}" width="${8 * S + 8}" height="${8 * S + 8}" rx="6" fill="none" stroke="${GOLD}" stroke-opacity=".55" stroke-width="1.5"/>
  ${board}${hlSvg}${coords}
  ${movingFirst}
  <g class="mate"><rect x="${BX}" y="${BY + 3 * S + 10}" width="${8 * S}" height="${2 * S - 20}" fill="#0c0708" fill-opacity=".82"/><text x="${BX + 4 * S}" y="${BY + 4 * S + 12}" font-size="34" font-weight="800" letter-spacing="6" fill="${GOLD}" text-anchor="middle" font-family="${FONT}">CHECKMATE</text></g>

  <rect x="520" y="24" width="556" height="492" rx="20" fill="url(#pn)" stroke="${RED}" stroke-opacity=".3"/>
  <circle cx="590" cy="82" r="33" fill="${RED}" opacity=".4" filter="url(#glow)"/>
  <circle cx="590" cy="82" r="34" fill="none" stroke="url(#foil)" stroke-width="3"/>
  ${avatar ? `<image href="${avatar}" x="560" y="52" width="60" height="60" clip-path="url(#av)" preserveAspectRatio="xMidYMid slice"/>` : `<circle cx="590" cy="82" r="30" fill="#1d1d22"/>`}
  <text x="642" y="78" font-size="22" font-weight="700" fill="#f6f6f7">${esc(cut(name, 26))}</text>
  <text x="642" y="100" font-size="13" font-family="${MONO}" fill="${GOLD}">@${esc(u.login)}</text>
  <circle class="dot" cx="560" cy="152" r="4" fill="#4ade80"/>
  <text x="574" y="156" font-size="12" font-family="${MONO}" fill="#cbbd98">live game · scholar's mate in 4</text>
  <line x1="544" x2="1052" y1="182" y2="182" stroke="#fff" stroke-opacity=".08"/>
  <text x="556" y="212" font-size="11" font-weight="600" letter-spacing="1.6" font-family="${MONO}" fill="#8c7a55">// MOVES</text>
  ${logSvg}
  <text x="1052" y="498" font-size="11" font-family="${MONO}" fill="#6f6450" text-anchor="end">github.com/${esc(u.login)}</text>
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
    return res.end(errorSvg("Add a GitHub username: /api/chess?u=username"));
  }
  try {
    const [u, repos, cm] = await Promise.all([
      gh("/users/" + name),
      gh(`/users/${name}/repos?per_page=100&sort=pushed`),
      gh(`/search/commits?q=author:${encodeURIComponent(name)}&per_page=1`).catch(() => null),
    ]);
    let avatar = "";
    try {
      const a = await fetch(u.avatar_url + (u.avatar_url.includes("?") ? "&" : "?") + "s=160");
      avatar = "data:" + (a.headers.get("content-type") || "image/png") + ";base64," + Buffer.from(await a.arrayBuffer()).toString("base64");
    } catch {}
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.statusCode = 200;
    res.end(build(u, repos, cm && typeof cm.total_count === "number" ? cm.total_count : null, avatar));
  } catch (e) {
    res.statusCode = e.code || 500;
    res.end(errorSvg(e.code === 404 ? "We couldn't find that GitHub user." : "Couldn't load the game. Try again soon."));
  }
};
