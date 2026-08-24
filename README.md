# GitHub Stats Card

A self-hosted GitHub profile statistics card generated automatically with GitHub Actions.

![GitHub stats card](https://raw.githubusercontent.com/Jiksi/github-stats-card/main/dist/github-stats.svg)

## Features

- Public repositories, stars, forks, followers, and recent activity
- Top programming language based on public repositories
- SVG output that can be embedded in a GitHub profile README
- Daily automatic updates without an external hosting service
- Manual workflow trigger
- Zero runtime dependencies and no personal access token required

## Use the card

Add this Markdown to your GitHub profile README:

```md
[![GitHub stats](https://raw.githubusercontent.com/Jiksi/github-stats-card/main/dist/github-stats.svg)](https://github.com/Jiksi)
```

## Customize

Edit [`config.json`](config.json) to change the username, title, and colors. Then run the **Update GitHub stats card** workflow manually or wait for the next scheduled update.

## Run locally

Node.js 20 or newer is recommended.

```bash
GITHUB_TOKEN=your_token npm run generate
```

A token is optional for low-volume public API requests, but authenticated requests have a higher rate limit.

## Automation

The workflow runs every day at **08:17 WITA** (00:17 UTC). It fetches current public GitHub data, regenerates the JSON and SVG outputs, and commits only when the generated files change.

## License

[MIT](LICENSE)
