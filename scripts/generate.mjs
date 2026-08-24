import { mkdir, readFile, writeFile } from "node:fs/promises";

const config = JSON.parse(await readFile(new URL("../config.json", import.meta.url), "utf8"));
const token = process.env.GITHUB_TOKEN;
const headers = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "github-stats-card"
};

if (token) headers.Authorization = `Bearer ${token}`;

async function github(path) {
  const response = await fetch(`https://api.github.com${path}`, { headers });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`GitHub API ${response.status}: ${message}`);
  }
  return response.json();
}

async function allPublicRepos(username) {
  const repos = [];
  for (let page = 1; ; page += 1) {
    const batch = await github(`/users/${encodeURIComponent(username)}/repos?type=owner&sort=updated&per_page=100&page=${page}`);
    repos.push(...batch.filter((repo) => !repo.private));
    if (batch.length < 100) return repos;
  }
}

const escapeXml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

const number = (value) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);

function topLanguage(repos) {
  const counts = new Map();
  for (const repo of repos) {
    if (repo.fork || !repo.language) continue;
    counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";
}

function renderCard(stats) {
  const theme = config.theme;
  const rows = [
    ["Public repos", number(stats.publicRepos), "Total stars", number(stats.totalStars)],
    ["Followers", number(stats.followers), "Total forks", number(stats.totalForks)],
    ["Top language", stats.topLanguage, "30-day activity", number(stats.recentActivity)]
  ];

  const rowSvg = rows.map((row, index) => {
    const y = 91 + index * 38;
    return `
      <text x="28" y="${y}" class="label">${escapeXml(row[0])}</text>
      <text x="174" y="${y}" class="value">${escapeXml(row[1])}</text>
      <text x="302" y="${y}" class="label">${escapeXml(row[2])}</text>
      <text x="470" y="${y}" class="value">${escapeXml(row[3])}</text>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="232" viewBox="0 0 560 232" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(config.title)}</title>
  <desc id="desc">GitHub statistics for ${escapeXml(stats.username)}, updated ${escapeXml(stats.updatedAt)}</desc>
  <style>
    .title { font: 600 19px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; fill: ${theme.title}; }
    .label { font: 400 13px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; fill: ${theme.muted}; }
    .value { font: 600 15px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; fill: ${theme.text}; }
    .footer { font: 400 11px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; fill: ${theme.muted}; }
  </style>
  <rect x="0.5" y="0.5" width="559" height="231" rx="10" fill="${theme.background}" stroke="${theme.border}"/>
  <circle cx="30" cy="31" r="5" fill="${theme.accent}"/>
  <text x="44" y="38" class="title">${escapeXml(config.title)}</text>
  <line x1="28" y1="57" x2="532" y2="57" stroke="${theme.border}"/>
  ${rowSvg}
  <line x1="28" y1="198" x2="532" y2="198" stroke="${theme.border}"/>
  <text x="28" y="218" class="footer">Updated daily · ${escapeXml(stats.updatedAt)}</text>
</svg>`;
}

const user = await github(`/users/${encodeURIComponent(config.username)}`);
const [repos, events] = await Promise.all([
  allPublicRepos(config.username),
  github(`/users/${encodeURIComponent(config.username)}/events/public?per_page=100`)
]);

const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
const stats = {
  username: user.login,
  publicRepos: user.public_repos,
  followers: user.followers,
  following: user.following,
  totalStars: repos.reduce((sum, repo) => sum + repo.stargazers_count, 0),
  totalForks: repos.reduce((sum, repo) => sum + repo.forks_count, 0),
  topLanguage: topLanguage(repos),
  recentActivity: events.filter((event) => Date.parse(event.created_at) >= since).length,
  updatedAt: new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "Asia/Makassar"
  }).format(new Date())
};

await mkdir(new URL("../dist/", import.meta.url), { recursive: true });
await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await writeFile(new URL("../data/stats.json", import.meta.url), `${JSON.stringify(stats, null, 2)}\n`);
await writeFile(new URL("../dist/github-stats.svg", import.meta.url), `${renderCard(stats)}\n`);

console.log(`Generated stats card for ${stats.username}.`);
