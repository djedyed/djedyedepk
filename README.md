# DJ Eddie Ed — Electronic Press Kit (public site)

The public-facing EPK for **DJ Eddie Ed (djedyed)**: the musical bridge between Southern Africa & the US.

Live at **https://djedyed.github.io/djedyedepk/** once GitHub Pages is switched on.

## What's on the page

- Hero, featured highlight (Apollo Theater, Harlem, Feb 23, 2023) and bio
- **Lifetime highlights with source tags.** Each one links to the record that backs it up:
  - **Third-party record**: confirmed by an outside source (a venue listing or a platform such as Serato)
  - **Artist-published**: from DJ Eddie Ed's own public profiles and flyers
- Mixcloud players for six featured mixes
- Client reviews, a tech rider, and a booking section with a Calendly link, a booking email (djedyed@gmail.com), a booking phone (+1 347 377 2968) and an inquiry form

## How it works

Think of it like a club with a front-of-house screen.

- `content.json` is the **printed set list** taped to the booth. The page shows it straight away, so the site works even if the database is unreachable.
- [Supabase](https://supabase.com) (open source) is the **live booth**. When it is reachable, the page refreshes with whatever is published in the back office ([djedyedepkbo](https://github.com/djedyed/djedyedepkbo)).
- Booking inquiries from the form go straight into Supabase. Visitors can drop an inquiry off but can never read one back; Row Level Security enforces that.

No build step, no framework, no server: plain HTML, CSS and JavaScript.

| File | Job |
|---|---|
| `index.html` | Page structure |
| `styles.css` | Look and feel |
| `app.js` | Loads the content, renders it, sends booking inquiries |
| `config.js` | Supabase address and *publishable* key (safe to be public) |
| `content.json` | Static backup of the published content |
| `assets/logo.svg` | The djedyed logo, vector source (made in Linearity Curve) |
| `assets/logo-*.png`, `assets/logo-768.webp` | Logo renders: hero image, header mark, browser-tab icon and link preview |

## Run it locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Publish on GitHub Pages (free)

Settings → Pages → Source: **Deploy from a branch** → Branch: `main` / root → Save.

## Updating content

Edit everything in the back office. After big edits, use **Publish → Download content.json** there and commit it here to refresh the backup copy.

## Publishing changes

This repo is pushed from Ed's Mac as **djedyed**, using the GitHub CLI (`gh`) login that git now uses for github.com.

1. `gh auth status` should show **djedyed** as the active account. Use `gh auth switch` if another account is active.
2. Commit, then `git push` (or click **Push origin** in GitHub Desktop).
3. Check it landed: `git ls-remote https://github.com/djedyed/djedyedepk refs/heads/main` must print the same commit as `git rev-parse main`.
