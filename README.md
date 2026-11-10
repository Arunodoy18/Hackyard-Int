# Builder Card

Turn a GitHub username into a clean, shareable profile card: top projects, main languages and recent activity.

**Live:** https://builder-card-phi.vercel.app

## Use it in your README

Replace `USERNAME` with your GitHub username:

```md
[![Builder Card](https://builder-card-phi.vercel.app/api/card?u=USERNAME)](https://builder-card-phi.vercel.app/?u=USERNAME)
```

The card updates by itself. You can also download it as PNG or SVG from the site.

### Chess mode

On the site, **Chess Mode** is a playable game: you play gold against the machine, and every move you make unlocks one thing about the developer (pawns unlock the basics, the queen unlocks the strongest skill).

For a README there is an animated version: a short game plays out by itself, each move reveals one fact, and it ends in checkmate.

```md
[![Builder Card: chess mode](https://builder-card-phi.vercel.app/api/chess?u=USERNAME)](https://builder-card-phi.vercel.app/?u=USERNAME)
```

## How it works

- `index.html`: the welcome screen and the card page (plain HTML, CSS and JavaScript, no build step).
- `api/card.js`: returns the card as an SVG image.
- `api/chess.js`: returns the animated chess card as an SVG image.
- `chess-engine.js`: the chess rules and the machine opponent (no dependencies).
- `api/profile.js`: fetches and caches GitHub data for the page.

Optional: set a `GITHUB_TOKEN` environment variable on Vercel to avoid GitHub's rate limit.
