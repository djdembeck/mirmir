# Learnings — mirmir-revitalization

## 2026-05-15 Session Start
- mirmir is currently a Ruby on Rails app (old version)
- Harmony (TypeScript/Deno) is at /tmp/harmony/ — this is the base to fork from
- Deno installed at /home/djdembeck/.deno/bin/deno (v2.7.14)
- Plan: Fork Harmony, extend with per-track credits extraction, credit UI, and MB injection
- Tidal v2 Credits API CONFIRMED working: GET /v2/tracks/{trackId}/relationships/credits?include=credits
- MB relationship creation requires form POST via editEntity(), NOT REST API
- Work-level caveat: Composer/Lyricist are work→artist in MB, NOT recording→artist

## Harmony Fork (2026-05-15)

- Harmony uses Deno with import maps (deno.json), Fresh framework, Preact/JSX
- `deno task check` = `deno check server/fresh.gen.ts cli.ts` — type-checks entry points
- `deno test` requires `--allow-read --allow-env` flags for provider tests that read testdata/ and .env
- Harmony's .gitignore is minimal (Fresh, dotenv, snaps, local, coverage) — merged with Deno/TypeScript patterns
- Harmony LICENSE is MIT (David Kellner 2022-2024); mirmir is GPL-3.0 — kept mirmir's LICENSE, created NOTICES file to credit Harmony's MIT
- rsync with --exclude='.git' is the cleanest way to copy Harmony files without touching mirmir's git history
- Harmony has 35 test suites with 552 steps, all passing
- deno.json tasks: check, ok, cli, dev, build, server
- Harmony uses JSR packages (@kellnerd/musicbrainz, @std/*, @b-fuze/deno-dom, @deno/gfm) and esm.sh for npm compat

## Tidal v2 Credits API Spike (2026-05-15)

### API Endpoint Confirmed
- **Endpoint:** `GET /v2/tracks/{trackId}/relationships/credits?include=credits`
- **Base URL:** `https://openapi.tidal.com/v2/`
- **Auth:** `POST https://auth.tidal.com/v1/oauth2/token` with `grant_type=client_credentials`
- **Token validity:** 14400 seconds (4 hours)

### Response Structure
```json
{
  "data": [{ "id": "...", "type": "credits" }],
  "included": [{ "id": "...", "type": "credits", "attributes": { "name": "...", "role": "..." } }]
}
```

### Free-Form Role Strings Observed
Lyricist, Keyboard, Mastering Engineer, Drum Kit, Producer, Composer, Co-Producer

### KEY INSIGHT
Credits API is the **primary source** for per-track credits, NOT the 7-role ArtistRoles enum.
The enum is a secondary classification.

### Test Data
- Album ID: `329293912`
- Track IDs: `329293927`, `329293934`, `329293940`, `329293948`
- Track `329293927` returned 20 credits

### Limitations
- Single credit GET returns 404
- `include=artist,category` doesn't add extra data with client credentials
- Must use relationships endpoint with `include=credits`

### Files Created
- `docs/tidal-credits-spike.md` - Full API documentation
- `spike.ts` - Minimal repro script
- `.sisyphus/evidence/task-1-tidal-credits-api.txt` - Execution evidence
