# Builder Card

Turn a GitHub username into a clean, shareable profile card: top projects, main languages and recent activity.

**Live:** https://builder-card-phi.vercel.app

## Use it in your README

Replace `USERNAME` with your GitHub username:

```md
[![Builder Card](https://builder-card-phi.vercel.app/api/card?u=USERNAME)](https://builder-card-phi.vercel.app/?u=USERNAME)
```

The card updates by itself. You can also download it as PNG or SVG from the site.

### Chess mode (animated)

A short chess game plays out. Each move reveals one thing about the developer, and it ends in checkmate.

```md
[![Builder Card: chess mode](https://builder-card-phi.vercel.app/api/chess?u=USERNAME)](https://builder-card-phi.vercel.app/?u=USERNAME)
```

## How it works

- `index.html`: the welcome screen and the card page (plain HTML, CSS and JavaScript, no build step).
- `api/card.js`: returns the card as an SVG image.
- `api/chess.js`: returns the animated chess card as an SVG image.
- `api/profile.js`: fetches and caches GitHub data for the page.

Optional: set a `GITHUB_TOKEN` environment variable on Vercel to avoid GitHub's rate limit.
