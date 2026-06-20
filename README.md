# Gloss

**Drop a link. Get a page worth printing.**

A gloss is a marginal note — the kind readers have written in the borders of
books for centuries. Gloss the app does the same job: you paste a tweet (or just
the URL) and it produces a single print-ready page — the core idea on the left,
matched reading from your own shelf on the right, with a written explanation of
why each book fits _this_ thing, not just the topic in general.

v1 is built for one specific reader: a developer / engineering leader who reads
a lot of technical Twitter and owns the shelf in
[`shared/readingList.ts`](shared/readingList.ts). Edit that file and rebuild to
make it yours.

## How it works

1. Paste tweet text and/or a URL. Pasted text is always the more reliable
   signal; a URL alone triggers a web-search fallback.
2. Your reading list is baked in — no login, no sync.
3. Claude (`claude-sonnet-4-6`) extracts the idea, picks 3–4 books, and writes
   the "why" for each, matched on situation rather than keyword.
4. One click opens a clean, letter-size print sheet in a new tab.

## Architecture

| Path      | What it is                                                                                                                                                                       |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared/` | Pure, dependency-light core: the reading list, prompt building, response parsing/validation, the deterministic fake, and the print-sheet HTML. Fully unit-tested.                |
| `server/` | A small [Hono](https://hono.dev) API holding the API key. `POST /api/gloss` calls Anthropic (with `web_search` when a URL is given) and serves the built frontend in production. |
| `src/`    | The React + Vite frontend: paste box, inline preview, print.                                                                                                                     |
| `e2e/`    | Playwright end-to-end tests.                                                                                                                                                     |

The browser never sees the API key — all Anthropic calls go through the server.

## Getting started

```bash
npm install
cp .env.example .env   # add your ANTHROPIC_API_KEY
npm run dev            # web on :5173, API on :8787 (Vite proxies /api)
```

Open http://localhost:5173.

No API key handy? Run the server in stub mode — it returns a real, shaped result
drawn from the actual shelf, with no network call:

```bash
GLOSS_FAKE_LLM=1 npm run dev
```

## The rails

Everything below runs in CI on every push and pull request
([`.github/workflows/ci.yml`](.github/workflows/ci.yml)), so new features and bug
fixes land on a known-good baseline.

```bash
npm run typecheck     # tsc, strict, project references
npm run lint          # eslint (flat config)
npm run format:check  # prettier
npm run test          # vitest — shared core + API routes
npm run test:e2e      # playwright — full stack in fake-LLM mode
npm run check         # typecheck + lint + format + unit tests
```

The e2e suite boots the real production server with `GLOSS_FAKE_LLM=1`, so it is
deterministic and needs no API key.

## Deployment

Gloss deploys to **Cloudflare Workers** on every push to `main` — but only when
the full CI gate (typecheck, lint, format, unit tests, build, e2e) is green. A
red check blocks the deploy. The same [Hono](https://hono.dev) app that the Node
server runs is served by the Worker ([`worker/index.ts`](worker/index.ts)):
`/api/*` hits the app, everything else is a static asset. The browser never sees
the API key — it lives only as a Worker secret.

**One-time setup (repo secrets):** add these under
_Settings → Secrets and variables → Actions_ — never commit them.

| Secret                 | Where to get it                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → _Edit Cloudflare Workers_ template |
| `ANTHROPIC_API_KEY`    | https://console.anthropic.com/ — uploaded to the Worker as a secret on each deploy  |

If your Cloudflare token can access more than one account, also set
`CLOUDFLARE_ACCOUNT_ID` (or add `account_id` to `wrangler.jsonc`).

Then every push to `main` deploys to `https://gloss.<your-subdomain>.workers.dev`.
To deploy from your machine instead: `npm run deploy` (after
`wrangler secret put ANTHROPIC_API_KEY`).

## Adding to the shelf

Edit [`shared/readingList.ts`](shared/readingList.ts). Each book has a `title`,
an `author`, and `themes` — short notes describing the _situations_ the book
speaks to. The themes are the matching surface, so write them about when the
book earns its place, not just what it's about. Run `npm run test` to confirm
the list and prompt still hold together.

## Scope

**In (v1):** tweet / thread text input, URL + text paste mode, the baked-in
15-book list, print-ready two-column layout, handle + date attribution.

**Later:** an editable reading list in the UI, Substack / blog input, PDF
export, saved history, share links.
