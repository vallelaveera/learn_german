# Career vocabulary bank

## Upload your file here

**Path:** `data/career-vocab/german_career_vocab.json`

Replace the placeholder with your full export (150+ entries). Keep the same JSON shape:

- `meta` — version, language, tracks, source, generatedAt
- `categories` — 7 category objects
- `entries` — array of `{ id, text, type, category, level, english, priority, industries?, variants? }`

## Enriching later

1. Generate a new batch from job descriptions (same format).
2. Merge new `entries` into `german_career_vocab.json` (dedupe by `id`).
3. Bump `meta.version` and update `meta.source` / `meta.generatedAt`.

Optional: keep source batches in `data/career-vocab/sources/` for reference (not loaded by the app).

## App usage

Loaded by `lib/career-vocab/load.ts`. Per-user progress will live in Redis later (`career_vocab:{userId}`), overlaid on this static bank.
