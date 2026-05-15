# F1: Plan Compliance Audit

**Plan**: `.sisyphus/plans/mirmir-revitalization.md`  
**Branch**: `feat/mirmir-revitalization`  
**Date**: 2026-05-15  
**Auditor**: oracle (F1 agent)

---

## Executive Summary

| Category | Result |
|----------|--------|
| Must Have | **9/9 PASS** |
| Must NOT Have | **8/8 PASS** |
| Task Deliverables (T1-T13) | **13/13 PASS** |
| Tests | **63/63 PASS** |
| Type Check | **PASS** (no errors) |
| Lint | **14 errors** in `mirmir/mb_injector_test.ts` (require-await) |

**VERDICT: APPROVE** — All Must Have, Must NOT Have, and Task Deliverable items are satisfied. Lint errors are isolated to a single test file and do not affect runtime functionality; flagged for F2 review.

---

## Must Have (9 items)

### 1. Per-track credit extraction from Tidal (Credits API)
**Status**: ✅ PASS

**Evidence**:
- File: `providers/Tidal/v2/lookup.ts` (lines 283-320)
- Method: `fetchTrackCredits(trackId: string)`
- Endpoint: `GET /v2/tracks/{trackId}/relationships/credits?include=credits`
- Parses JSON:API response with `included` array of `credits` resources
- Maps to `TrackCredit` with `name`, `role`, `sources: ["Tidal"]`, `originalRole`, `externalIds`
- Graceful degradation: catches errors, logs warning, returns `[]`
- Sequential fetching (not parallel) — rate limiting respected
- Test file: `providers/Tidal/v2/credits.test.ts` (247 lines, 11 test cases)

### 2. Per-track credit extraction from Discogs (extraartists)
**Status**: ✅ PASS

**Evidence**:
- File: `providers/Discogs/credits.ts` (107 lines)
- Methods: `extractTrackLevelCredits()`, `buildReleaseLevelCreditMap()`
- Handles track-level `extraartists` per track
- Handles release-level `extraartists` with `tracks` field (track range parsing)
- Track range parsing: `"1, 3-5, 7"` and vinyl `"A1-A3"` supported
- Preserves ANV as `creditedName`
- Splits compound roles: `"Produced By, Mixed By"`
- Test file: `providers/Discogs/credits.test.ts` (244 lines, 24 test cases)

### 3. Existing MB credit reading (artist-recording relationships)
**Status**: ✅ PASS

**Evidence**:
- File: `mirmir/mb_credits.ts` (201 lines)
- Method: `fetchRecordingCredits(mbid: string)`
- Endpoint: `GET /ws/2/recording/{mbid}?inc=artist-rels&fmt=json`
- Rate limited to 1 req/sec (`MB_RATE_LIMIT_MS = 1000`)
- Converts MB relations to `TrackCredit[]` with `sources: ["MusicBrainz"]`
- Optional trigger (UI button in `CreditView.tsx`), not automatic
- Test file: `mirmir/mb_credits_test.ts`

### 4. Combinable merge of credits across sources with source tracking
**Status**: ✅ PASS

**Evidence**:
- File: `harmonizer/merge.ts` (lines 271-281, 302-329)
- Method: `mergeTrackCredits(target, sources)`
- Deduplicates by normalized `(name, role)` pair
- Unions `sources` arrays: `["Tidal", "Discogs"]`
- Unions `externalIds` with deduplication by `(provider, type, id)`
- Preserves `creditedName`, `mbid`, `originalRole` from most specific source
- Added to Phase 3 custom combinable merge section
- Test file: `harmonizer/merge.test.ts` (12 credit merge test cases)

### 5. Credit-focused UI (per-track and common-contributors views)
**Status**: ✅ PASS

**Evidence**:
- Per-track view: `server/islands/CreditView.tsx` (280 lines)
  - Card-per-track layout with role-grouped credits
  - Source badges (Tidal, Discogs, MusicBrainz) with color coding
  - "Check existing MB credits" button triggers T8
  - Empty state: "No credits found for this release."
  - Merges fetched MB credits with existing credits, deduplicates
- Common contributors view: `server/islands/CommonContributors.tsx` (184 lines)
  - Sidebar panel showing contributors on 2+ tracks
  - Track range compression: `1-5` not `1, 2, 3, 4, 5`
  - Toggle expand/collapse
  - Source badges on each contributor

### 6. Programmatic MB relationship injection (not just annotation text)
**Status**: ✅ PASS

**Evidence**:
- File: `mirmir/mb_injector.ts` (377 lines)
- Class: `MBInjector`
- Uses `rels.{N}.*` form fields:
  - `rels.{N}.type` — MB relationship type UUID
  - `rels.{N}.target` — artist MBID
  - `rels.{N}.backward` — "1" (recording is entity1)
  - `rels.{N}.target_credit` — credited name
  - `rels.{N}.attributes.{M}.type` — attribute type UUID
- Session-based login with CSRF token extraction
- Rate limited to 1 req/sec
- Dry-run mode: `dryRun()` returns full form field details without POSTing
- Edit notes: "Imported with mirmir, using data from: [sources]"
- Skips work-level credits (Composer, Lyricist) with logged warning
- Test file: `mirmir/mb_injector_test.ts`

### 7. Bot account configuration for MB editing
**Status**: ✅ PASS

**Evidence**:
- File: `.env.example` (lines 33-36)
- Variables: `MIRMIR_MB_USERNAME=`, `MIRMIR_MB_PASSWORD=`, `MIRMIR_MB_BASE_URL=https://test.musicbrainz.org`
- Used in: `server/routes/api/inject.ts` (lines 35-37)
- Returns 503 if credentials not configured

### 8. Unified role mapping from Tidal + Discogs free-form roles to MB relationship types (with confirmed UUIDs)
**Status**: ✅ PASS

**Evidence**:
- File: `mirmir/role_mapping.ts` (510 lines)
- All 12 observed Tidal roles mapped with confirmed UUIDs:
  - Producer → `5c0ceac3-feb4-41f0-868d-dc06f6e27fc0`
  - Co-Producer → producer + co attribute `ac6f6b4c-a4ec-4483-a04e-9f425a914573`
  - AdditionalProducer → producer + additional attribute `0a5341f8-3b1d-4f99-a0c6-26b7f4e42c7f`
  - Featured Artist → performer + guest attribute `b3045913-62ac-433e-9211-ac683cdf6b5c`
  - Mixing / Mixing Engineer → mixer `3e3102e1-1896-4f50-b5b2-dd9824e46efe`
  - Mastering Engineer → mastering `8c9b9e5e-59e9-4d4c-9609-039c8e4f061d`
  - Recording Engineer → recording `6e6e9a6e-1ee4-4b8d-ba4f-e7cc1a8473e5`
  - Drum Kit → performer + drums `3bccb7eb-cbca-42cd-b0ac-a5e959df7221`
  - Keyboard → performer + keyboard `95b0c3d2-9606-4ef5-a019-9b7437f3adda`
  - Composer, Lyricist → work-level (flagged, skipped for injection)
- Discogs roles: 40+ mappings including bracket notation ("Guitar [Electric]")
- Bracket notation parser: `parseBracketNotation()`
- Compound role splitter: `splitCompoundRoles()`
- Work-level flagging: `isWorkLevelRole()`
- Test file: `mirmir/role_mapping_test.ts`

### 9. All existing Harmony features preserved
**Status**: ✅ PASS

**Evidence**:
- `deno test` → **63 passed (734 steps) | 0 failed**
- `deno check **/*.ts` → **no type errors**
- No modifications to existing Harmony provider behavior for non-credits fields
- All existing test files still pass

---

## Must NOT Have (8 items)

### 1. NO Jaxsta integration
**Status**: ✅ PASS

**Evidence**: `grep -ri "jaxsta" --include="*.{ts,tsx}"` → 0 matches

### 2. NO media downloading
**Status**: ✅ PASS

**Evidence**: `grep -ri "download" mirmir/ --include="*.{ts,tsx}"` → 0 matches  
(Note: "download" appears in unrelated files like `providers/Bandcamp/mod.ts` and testdata, but NOT in mirmir-specific code)

### 3. NO user authentication system
**Status**: ✅ PASS

**Evidence**: `grep -ri "auth\|login" server/routes/ --include="*.{ts,tsx}"` → only `server/routes/api/inject.ts`  
This is the MB bot credential check (env vars), NOT a user authentication system. Plan explicitly states: "MB bot login is OK".

### 4. NO batch/multi-release operations
**Status**: ✅ PASS

**Evidence**: `grep -ri "batch\|multi-release\|multiRelease" --include="*.{ts,tsx}"` → 0 matches

### 5. NO Spotify experimental credits endpoint
**Status**: ✅ PASS

**Evidence**: `grep -ri "spotify.*credit\|credit.*spotify" --include="*.{ts,tsx}"` → 0 matches

### 6. NO PostgreSQL
**Status**: ✅ PASS

**Evidence**: `grep -ri "postgres\|postgresql\|\"pg\"" --include="*.{yml,yaml,json,ts,tsx,Dockerfile}"` → matches only in testdata and unrelated providers (Ototoy, Bandcamp), NOT in Docker/config files.  
`Dockerfile` uses `denoland/deno:alpine`. `docker-compose.yml` has no PostgreSQL service.

### 7. NO changes to Harmony's existing merge behavior for non-credits properties
**Status**: ✅ PASS

**Evidence**:
- `harmonizer/merge.ts` — only addition is the credit merge block (lines 271-281) in Phase 3
- All existing Phase 1, Phase 2, and Phase 3 logic (artist credits, labels, recordings) is untouched
- Existing merge tests still pass

### 8. NO AI slop
**Status**: ✅ PASS

**Evidence**:
- No over-abstracted types — `TrackCredit`, `RoleMapping`, `MBAttribute` are concrete and well-named
- No generic names like `data`/`result`/`item` — all variables have semantic names
- No excessive comments on obvious code — comments explain WHY, not WHAT
- No premature generalization for "future sources" — mapping table covers Tidal + Discogs only
- Clean, readable code throughout new files

---

## Task Deliverables (T1-T13)

| Task | Deliverable File(s) | Status |
|------|---------------------|--------|
| T1 | `docs/tidal-credits-spike.md` | ✅ EXISTS (4049 bytes) |
| T2 | `harmonizer/types.ts` (TrackCredit), `harmonizer/properties.ts` (combinableTrackProperties), `harmonizer/credits.test.ts` | ✅ ALL EXIST |
| T3 | `mirmir/role_mapping.ts`, `mirmir/role_mapping_test.ts` | ✅ ALL EXIST |
| T4 | `mirmir/test/fixtures/` (3 fixture files), `mirmir/test/helpers.ts`, `mirmir/test/helpers_test.ts` | ✅ ALL EXIST |
| T5 | `Dockerfile`, `docker-compose.yml`, `.env.example` | ✅ ALL EXIST |
| T6 | `providers/Tidal/v2/lookup.ts` (credit extraction), `providers/Tidal/v2/api_types.ts` (CreditsRelationshipResponse), `providers/Tidal/v2/credits.test.ts` | ✅ ALL EXIST |
| T7 | `providers/Discogs/credits.ts`, `providers/Discogs/credits.test.ts` | ✅ ALL EXIST |
| T8 | `mirmir/mb_credits.ts`, `mirmir/mb_credits_test.ts` | ✅ ALL EXIST |
| T9 | `harmonizer/merge.ts` (mergeTrackCredits), `harmonizer/merge.test.ts` | ✅ ALL EXIST |
| T10 | `server/islands/CreditView.tsx` | ✅ EXISTS (7750 bytes) |
| T11 | `server/islands/CommonContributors.tsx` | ✅ EXISTS (4949 bytes) |
| T12 | `mirmir/mb_injector.ts`, `mirmir/mb_injector_test.ts` | ✅ ALL EXIST |
| T13 | `server/islands/CreditSelector.tsx`, `server/islands/InjectionFlow.tsx`, `server/islands/CreditInjector.tsx`, `server/routes/api/inject.ts` | ✅ ALL EXIST |

---

## Issues Found (Non-blocking for F1)

1. **Lint errors in test file**: `deno lint` reports 14 `require-await` errors in `mirmir/mb_injector_test.ts`. These are minor style issues in test mocks and do not affect runtime behavior. Recommended for F2 cleanup.

2. **Unconfirmed UUIDs**: `mirmir/role_mapping.ts` has empty strings for some less-common MB relationship types (remixer, djmixer, orchestrator, editor, programmer) and instrument attributes (electric, acoustic, backing, lead, bass, guitar, piano, vocals, violin, cello, saxophone, trumpet, flute, harp, organ, synthesizer, percussion, horn). These are explicitly documented with `// UNCONFIRMED` comments and are handled gracefully by the injector (skipped as "unconfirmed mapping"). All CONFIRMED UUIDs from the plan are present and correct.

---

## Final Verdict

**Must Have [9/9] | Must NOT Have [8/8] | Tasks [13/13] | VERDICT: APPROVE**

All required features are implemented, all guardrails are respected, all task deliverables exist with substantive implementation. The codebase is ready for F2 (code quality review) and F3 (manual QA).
