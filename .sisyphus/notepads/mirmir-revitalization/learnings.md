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

## Test Infrastructure Setup (2026-05-15)

### Fixtures Created
- `mirmir/test/fixtures/tidal-credits-response.json` - Tidal v2 Credits API response with 10 credits covering all observed roles from spike
- `mirmir/test/fixtures/discogs-extraartists-response.json` - Discogs release with release-level and track-level extraartists, including ANV fields
- `mirmir/test/fixtures/mb-artist-recording-rels.json` - MusicBrainz recording with artist relationships (producer, engineer, mixer)

### Test Helpers Module
- `mirmir/test/helpers.ts` provides:
  - `loadFixture(name: string)` - generic fixture loader
  - Typed fixture creators for Tidal, Discogs, MB
  - `createMockTrackCredit(overrides?)` - helper for creating test credits
- Local `TrackCredit` interface defined (to be replaced by T2 type when available)

### Test Pattern
- Uses `@std/testing/bdd` describe/it style (Harmony convention)
- All tests pass: 1 passed (11 steps)
- `deno test --allow-read --allow-env mirmir/test/`

### Key Learnings
- Fixtures should be realistic but minimal - include only necessary fields
- Typed interfaces in helpers.ts provide better IDE support and type safety
- Test helpers should support overrides for flexibility
- Deno test requires `--allow-read --allow-env` flags for fixture loading

## T2: TrackCredit Type System (2026-05-15)
- Test files use `.test.ts` suffix (not `_test.ts`), matching Deno convention
- `assertExists` is NOT in `std/assert/assert_equals.ts` — use `assertNotEquals` from `std/assert/assert_not_equals.ts` instead
- `ExternalEntityId` (from types.ts) is the correct type for `externalIds` in TrackCredit, not a generic `ExternalIds`
- Release-level `credits?: string` in HarmonyRelease is DIFFERENT from track-level `credits?: TrackCredit[]` — they coexist
- `combinableTrackProperties` uses `as const satisfies Array<keyof HarmonyTrack>` — adding a new field to HarmonyTrack automatically validates the property array at type-check time
- TDD flow confirmed: write test → verify failure → implement → verify pass → regression check

## Task 3: Role Mapping (2026-05-15)

- `mirmir/` directory created for mirmir-specific modules (separate from Harmony core)
- `assertNotEquals` is in `std/assert/assert_not_equals.ts`, NOT in `assert_equals.ts` (Deno std@0.216.0)
- `deno check` is sufficient for type-checking when LSP is unavailable
- Discogs bracket notation: "Guitar [Electric]" — base role + qualifier in brackets
- Compound roles: "Produced By, Mixed By" — comma-separated or " & " separated
- Work-level roles (Composer, Lyricist, Songwriter) use placeholder UUIDs since they need work→artist relationships, not recording→artist
- MB attribute UUIDs confirmed: guest=b3045913, additional=0a5341f8, co=ac6f6b4c
- tidalRoleMap has exactly 12 entries (all confirmed Tidal roles), discogsRoleMap has 35+ entries

## UUID Verification Pattern

- Always validate UUIDs with regex `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/` — fabricated UUIDs often have invalid hex chars (g-z) or wrong segment lengths
- When a UUID appears in multiple places in a plan, check for inconsistencies — the recording UUID had two versions (35-char vs 36-char)
- `as const` typing with empty string `''` still works for TypeScript — the type narrows to `""` which is fine for mapping tables
- Deno `deno check` is the primary type checker for this project (LSP not installed)

## T6: Tidal Credits Extraction (2026-05-15)

- `convertTrack()` changed from sync to async — this ripples to `getFullAlbumTracklist()` and `getFullVideoTracklist()` which must now await it
- `items.forEach` → `for...of` loop required for sequential async iteration (can't await inside forEach)
- Snapshot tests break when new optional fields are added to HarmonyTrack — `credits: undefined` appears in snapshots even though the field is undefined. Must update snapshots with `--allow-write -- --update`
- The `this.provider.query()` method is the correct way to make API calls from within a ReleaseLookup — it handles auth, rate limiting, and caching
- `fetchTrackCredits` constructs the credits URL using `new URL(path, baseUrl)` — the base URL must end with `/` for proper URL resolution
- `satisfies TrackCredit` is useful for type-narrowing in map callbacks — ensures the object literal matches the interface exactly
- When credits API calls fail in test mode (no testdata), the catch block returns `[]`, and `credits.length ? credits : undefined` evaluates to `undefined` — this is the expected graceful degradation behavior

## Task 7: Discogs Extraartists Credit Extraction (2026-05-15)

- Created `providers/Discogs/credits.ts` with 4 exported functions:
  - `parseTrackRange(tracksStr, trackPositions)` — parses "1, 3-5, 7" and vinyl "A1-A3" into track indices
  - `convertExtraartistToCredits(artist)` — converts Artist to TrackCredit[], splits compound roles
  - `extractTrackLevelCredits(track)` — extracts credits from track.extraartists
  - `buildReleaseLevelCreditMap(extraartists, trackPositions)` — distributes release-level credits by track range
- Integrated into `mod.ts`: `convertMedia()` builds release-level credit map, `convertRawTrack()` merges track-level + release-level credits
- Track positions for credit matching use the raw `track.position` from the tracklist (before medium prefix stripping)
- Empty `tracks` field on release-level extraartist → credit applies to ALL tracks
- Snapshot tests needed updating because `credits` field now appears on tracks with extraartists
- Fixture only has 3 tracks (positions "1", "2", "3") — release-level extraartists referencing "7" or "10" won't match
- `deno test --allow-write ... -- --update` updates snapshot files in place
- Pre-existing test failures (rate limiting, 404 mock) are unrelated to credit changes

## Task 8: MB Credits Module (2026-05-15)

- MB API returns 400 (not 404) for invalid UUIDs in recording endpoint — handle both 400 and 404 gracefully
- Deno test resource leak detection: must consume or cancel response bodies (e.g., `await response.body?.cancel()`) even in error paths
- Rate limiter timing tests: measure total elapsed time for 2 requests, not gap between them — network latency makes gap measurements unreliable
- `assertNotEquals` is in `std/assert/assert_not_equals.ts`, NOT in `assert_equals.ts` (confirmed again)
- Module-level rate limiter state (`let lastRequestTime`) works for sequential access; `resetRateLimiter()` export needed for test isolation
- MB API User-Agent requirement: must include app name, version, and URL
- `satisfies` keyword works for type-checking inline object literals against interfaces

## Task 10: Credit-Focused Per-Track View UI (2026-05-15)

- Fresh islands are registered in `fresh.gen.ts` manually (not auto-generated in this codebase) — must add both import and manifest entry
- CSS for islands goes in `server/static/harmony.css` following the existing `/* ComponentName.tsx */` section convention
- `useSignal` + `useCallback` pattern works well for Fresh islands with async fetch operations
- Preact `style={{ backgroundColor: value }}` accepts CSS variable strings like `'var(--tidal)'` directly
- `user-select: all` CSS property makes text selectable on click — perfect for copyable names
- Grid layout `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))` gives responsive card layout without media queries (though added mobile collapse for <=40rem)
- Empty state should only show when BOTH existing credits AND fetched MB credits are absent
- Merging fetched credits with existing ones requires deduplication logic (name + role match)
- The `recordingMbid` comes from `track.recording?.mbid` on HarmonyTrack, not from TrackCredit.mbid
- `deno check server/islands/CreditView.tsx` is sufficient for island-level type checking; `deno task check` validates full project
- Fresh island components can import from `@/mirmir/` modules directly — no special path configuration needed beyond existing import map

## Task 12: MB Injector (2026-05-15)

- `rels.{N}.type` and `rels.{N}.attributes.{M}.type` both end with `.type` — when counting submitted relationships, use regex `/^rels\.\d+\.type$/` not `.endsWith('.type')`
- `URLSearchParams.toString()` encodes spaces as `+` — when asserting body content, check for `+` not spaces
- When mocking `globalThis.fetch`, GET requests have `init` as `undefined` — check `init?.method !== 'POST'` instead of `init?.method === 'GET'`
- `dryRun()` is a pure computation that doesn't call `rateLimitedFetch` — rate limiting tests must use `login()` or `injectCredits()` instead
- Guitar [Electric] attributes have empty typeIds (UNCONFIRMED) — they are silently omitted from form fields, not included with empty values
- `mapRole()` requires the original role string (e.g., 'Producer') not the normalized role (e.g., 'producer') — the tidalRoleMap keys are case-sensitive
- MB form POST uses `redirect: 'manual'` to capture Set-Cookie headers and prevent automatic redirect following
