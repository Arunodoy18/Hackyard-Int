// Returns everything the Builder Card page needs for one GitHub user, in one call.
// Usage: /api/profile?u=<github-username>
// The result is cached for a while so many visitors share one GitHub lookup.

async function gh(path) {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "builder-card" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = "Bearer " + process.env.GITHUB_TOKEN;
  const r = await fetch("https://api.github.com" + path, { headers });
  if (r.status === 404) { const e = new Error("User not found"); e.code = 404; throw e; }
  if (r.status === 403 || r.status === 429) { const e = new Error("Rate limited"); e.code = 429; throw e; }
  if (!r.ok) { const e = new Error("GitHub error"); e.code = 502; throw e; }
  return r.json();
}

module.exports = async (req, res) => {
  const name = String(new URL(req.url, "http://x").searchParams.get("u") || "").trim().replace(/^@/, "");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (!/^[a-z\d](?:[a-z\d-]{0,38})$/i.test(name)) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: "Please enter a valid GitHub username." }));
  }
  try {
    const [user, repos, events, cm] = await Promise.all([
      gh("/users/" + name),
      gh(`/users/${name}/repos?per_page=100&sort=pushed`),
      gh(`/users/${name}/events/public?per_page=100`),
      gh(`/search/commits?q=author:${encodeURIComponent(name)}&per_page=1`).catch(() => null),
    ]);
    res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=86400");
    res.statusCode = 200;
    res.end(JSON.stringify({ user, repos, events, commits: cm && typeof cm.total_count === "number" ? cm.total_count : null }));
  } catch (e) {
    res.statusCode = e.code || 500;
    if (e.code === 404) res.setHeader("Cache-Control", "public, s-maxage=300");
    res.end(JSON.stringify({ error: e.code === 404 ? "We couldn't find that GitHub user. Please check the spelling." : e.code === 429 ? "Too many requests right now. Please try again in a few minutes." : "Something went wrong. Please try again." }));
  }
};
