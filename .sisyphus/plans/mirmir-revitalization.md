# Mirmir Revitalization: Per-Track Music Credits Aggregator & MusicBrainz Injector

## TL;DR

> **Quick Summary**: Fork Harmony (TypeScript/Deno music metadata aggregator) and extend it with structured per-track credits extraction, a credit-focused UI, and programmatic MusicBrainz relationship injection via URL seeding + form-based edit API.
> 
> **Deliverables**:
> - Extended Harmony type system with `TrackCredit[]` on `HarmonyTrack`
> - Tidal provider enhanced to extract per-track credits via `/v2/tracks/{id}/relationships/credits` endpoint
> - Discogs provider enhanced to extract `extraartists` per-track credits with role mapping
> - MusicBrainz provider enhanced to read existing artist-recording relationships
> - Credit-focused web UI (per-track view + common contributors view)
> - Programmatic MB relationship injection via URL seeding (`rels.{N}.*` query params) + `musicbrainz-api` form POST (bot account + session auth + CSRF auto-handled)
> - Unified credit→MB role mapping table (covers both Tidal free-form roles and Discogs free-form roles, with MB relationship type UUIDs + attribute UUIDs)
> - Combinable credit merge algorithm (union from all sources with deduplication)
> - Docker deployment
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 5 waves
> **Critical Path**: T1 (spike) → T2 (types) → T6-T9 (providers + merge) → T10 (UI) → T13 (injection UI) → F1-F4

---

## Context

### Original Request
Revitalize mirmir — a Ruby on Rails tool that displayed Jaxsta per-track credits for easy copy-paste into MusicBrainz. Jaxsta is now dead (2025). User wants to move away from Ruby, get rich per-track credits from current sources, and actually inject those credits into MusicBrainz programmatically.

### Interview Summary
**Key Discussions**:
- **Jaxsta is dead**: Primary data source gone, need replacement
- **Tidal as primary**: User prefers Tidal as primary credits source. CONFIRMED: Tidal v2 Credits API (`/v2/tracks/{id}/relationships/credits?include=credits`) returns rich free-form role strings (not just 7 ArtistRoles)
- **Programmatic MB injection**: User explicitly wants automated relationship creation, not just display or annotation text
- **Build on Harmony**: Fork kellnerd/harmony (MIT, TypeScript, 11 providers, merge algorithm, MB seeding)
- **Critical gap**: Harmony does NOT extract per-track credits — this is mirmir's value add
- **Deno stack**: Stay on Harmony's Deno + Fresh + Preact stack for v1 velocity
- **Database**: Defer PostgreSQL to v1.5, use Harmony's snap_storage first

**Research Findings** (CONFIRMED via real API calls and source code inspection):
- **Tidal v2 Credits API** ✅ CONFIRMED WORKING: `GET /v2/tracks/{trackId}/relationships/credits?include=credits` returns per-track credits with free-form role strings (NOT limited to 7 ArtistRoles). Observed roles: Co-Producer, Composer, Drum Kit, Keyboard, Lyricist, Mastering Engineer, Producer, AdditionalProducer, Featured Artist, Mixing, Mixing Engineer, Recording Engineer. Auth: Tiddl's client credentials (`client_id=4N3n6Q1x95LL5K7p`) work for `grant_type=client_credentials` on v2 Open API. Single credit GET (`/v2/credits/{id}?include=artist,category`) returns 404 with client credentials — must use relationship endpoint. `include=artist,category` on relationship endpoint does NOT add extra data with client credentials auth. Token valid 14400s.
- **Discogs API**: Has `extraartists` per track with free-form roles + track ranges + artist name variations. Harmony ignores these. Requires role mapping to MB types.
- **MB URL seeding format** ✅ CONFIRMED from server source (`EditRelationships.pm` lines 90-296): `rels.{N}.type` (link type UUID or integer ID), `rels.{N}.target` (artist MBID), `rels.{N}.backward`, `rels.{N}.source_credit`, `rels.{N}.target_credit`, `rels.{N}.begin_date`, `rels.{N}.end_date`, `rels.{N}.ended`, `rels.{N}.link_order`, `rels.{N}.attributes.{M}.type`, `rels.{N}.attributes.{M}.credited_as`, `rels.{N}.attributes.{M}.text_value`. This CAN pre-fill artist-recording relationships (contradicts earlier assumption about URL seeding limitations).
- **MB REST API CANNOT create relationships** — only tags, ratings, barcodes, ISRCs. Programmatic relationship creation requires form POST via `musicbrainz-api`'s `editEntity()` method with `rels.{N}.*` fields.
- **`musicbrainz-api` library** only implements `addUrlToRecording()` — artist-recording relationships need custom extension using `editEntity()` with `rels.{N}.*` form fields.
- **MB attribute type UUIDs** ✅ CONFIRMED from server SQL: additional=`0a5341f8-3b1d-4f99-a0c6-26b7f4e42c7f`, co=`ac6f6b4c-a4ec-4483-a04e-9f425a914573`, guest=`b3045913-62ac-433e-9211-ac683cdf6b5c`, solo=`1c186ed2-8932-424b-8d69-0e8f4f8be8b0`, keyboard=`95b0c3d2-9606-4ef5-a019-9b7437f3adda`, drums=`3bccb7eb-cbca-42cd-b0ac-a5e959df7221`
- **Work-level caveat**: MB models Composer/Lyricist as work→artist relationships (NOT recording→artist). v1 should skip Composer/Lyricist for injection OR lookup Work entities first.
- **Old mirmir's v1 Tidal API**: Deprecated 2025-01-21 — must use v2 Open API now
- **Test album**: Tidal album ID `329293912` (Drake - For All The Dogs Scary Hours Edition), track IDs `329293927`, `329293934`, `329293940`, `329293948`

### Metis Review
**Identified Gaps** (addressed):
- MB seeding cannot pre-fill credits → Resolved: user chose programmatic injection via `rels.{N}.*` form fields through `musicbrainz-api`'s `editEntity()` (CONFIRMED from server source)
- Tidal v2 ArtistRoles may not return per-track data → Resolved: Credits API (`/v2/tracks/{id}/relationships/credits?include=credits`) CONFIRMED WORKING with free-form role strings (much richer than 7-role ArtistRoles enum)
- Discogs free-form roles need mapping to MB types → Resolved: unified role mapping table (Task 3) covers BOTH Tidal and Discogs with confirmed MB UUIDs
- Merge strategy for credits must be combinable (not first-wins) → Resolved: custom union merge with deduplication
- Work-level relationships (Composer/Lyricist) → Resolved: skip for v1 recording-level injection, log as "skipped: work-level"

---

## Work Objectives

### Core Objective
Fork Harmony and extend it to extract, display, and programmatically inject structured per-track music credits into MusicBrainz.

### Concrete Deliverables
- Fork of kellnerd/harmony with extended `TrackCredit` type system
- Enhanced Tidal provider (Credits API), Discogs provider (extraartists), and MusicBrainz provider for per-track credits
- Credit-focused web UI with per-track and common-contributors views
- Programmatic MB relationship injection via `rels.{N}.*` form fields + `musicbrainz-api` `editEntity()`
- Unified credit→MB role mapping table (Tidal + Discogs, with confirmed MB relationship type UUIDs + attribute type UUIDs)
- Docker deployment image

### Definition of Done
- [ ] User can enter a Tidal/Discogs/MB URL or release ID and see structured per-track credits
- [ ] Credits from all available sources are merged with source tracking
- [ ] User can select credits and inject them as relationships into MusicBrainz
- [ ] All existing Harmony functionality still works (regression-free)
- [ ] Docker container builds and runs with all providers configured

### Must Have
- Per-track credit extraction from Tidal (Credits API `/v2/tracks/{id}/relationships/credits`) and Discogs (extraartists)
- Existing MB credit reading (artist-recording relationships)
- Combinable merge of credits across sources with source tracking
- Credit-focused UI showing per-track and common-contributors views
- Programmatic MB relationship injection (not just annotation text)
- Bot account configuration for MB editing
- Unified role mapping from Tidal + Discogs free-form roles to MB relationship types (with confirmed UUIDs)
- All existing Harmony features preserved (release lookup, merge, URL seeding, MBID resolution)

### Must NOT Have (Guardrails)
- NO Jaxsta integration (API is dead)
- NO media downloading (mirmir is a credits tool, not a downloader)
- NO user authentication system in v1 (single-user tool)
- NO batch/multi-release operations in v1
- NO Spotify experimental credits endpoint (undocumented, unstable, no production credits)
- NO PostgreSQL in v1 (use Harmony's snap_storage, defer DB to v1.5)
- NO changes to Harmony's existing merge behavior for non-credits properties
- AI slop guardrails: no over-abstracted credit types, no generic names like `data`/`result`/`item`, no excessive comments on obvious code, no premature generalization for "future sources"

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Harmony has Deno test framework + snapshot testing)
- **Automated tests**: TDD (RED→GREEN→REFACTOR)
- **Framework**: Deno test (`deno test`) with snapshot assertions
- **If TDD**: Each task follows RED (failing test against snapshot) → GREEN (minimal impl to pass) → REFACTOR

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **API validation**: Use Bash (curl) — Hit Tidal/Discogs/MB APIs, assert response structure
- **Provider logic**: Use Bash (deno test) — Run unit tests, assert pass/fail counts
- **Web UI**: Use Playwright — Navigate, search, assert credit display, screenshot
- **MB injection**: Use Bash (curl) — Test on test.musicbrainz.org, verify relationship created

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 0 (Start Immediately - spike doc, already confirmed):
└── Task 1: Tidal v2 Credits API spike documentation [quick]

Wave 1 (After Wave 0 - foundation + types, MAX PARALLEL):
├── Task 2: Extend HarmonyTrack with TrackCredit type system [deep]
├── Task 3: Unified credit→MB role mapping table (Tidal + Discogs) [deep]
├── Task 4: Harmony test infrastructure setup for mirmir [quick]
└── Task 5: Docker development environment [quick]

Wave 2 (After Wave 1 - provider enhancements, MAX PARALLEL):
├── Task 6: Tidal provider: extract per-track credits via Credits API (depends: T1, T2, T3) [deep]
├── Task 7: Discogs provider: extract extraartists credits (depends: T2, T3) [deep]
├── Task 8: MusicBrainz provider: read existing artist-recording relationships (depends: T2) [deep]
└── Task 9: Combinable credit merge algorithm (depends: T2) [deep]

Wave 3 (After Wave 2 - UI + injection, MAX PARALLEL):
├── Task 10: Credit-focused web UI — per-track view (depends: T6, T7, T9) [visual-engineering]
├── Task 11: Credit-focused web UI — common contributors view (depends: T10) [visual-engineering]
├── Task 12: Programmatic MB relationship injection via rels form fields (depends: T2, T3) [deep]
└── Task 13: MB injection UI — credit selection + injection flow (depends: T10, T12) [visual-engineering]

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high + playwright)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: T1 → T2 → T6/T7/T8/T9 → T10 → T13 → F1-F4 → user okay
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 4 (Waves 2 & 3)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| T1 | - | T6 |
| T2 | - | T6, T7, T8, T9 |
| T3 | - | T7, T12 |
| T4 | - | - |
| T5 | - | - |
| T6 | T1, T2, T3 | T10 |
| T7 | T2, T3 | T10 |
| T8 | T2 | T10 |
| T9 | T2 | T10 |
| T10 | T6, T7, T9 | T11, T13 |
| T11 | T10 | - |
| T12 | T2, T3 | T13 |
| T13 | T10, T12 | - |

### Agent Dispatch Summary

- **Wave 0**: 1 task — T1 → `quick`
- **Wave 1**: 4 tasks — T2 → `deep`, T3 → `deep`, T4 → `quick`, T5 → `quick`
- **Wave 2**: 4 tasks — T6 → `deep`, T7 → `deep`, T8 → `deep`, T9 → `deep`
- **Wave 3**: 4 tasks — T10 → `visual-engineering`, T11 → `visual-engineering`, T12 → `deep`, T13 → `visual-engineering`
- **FINAL**: 4 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. ~~Tidal v2 ArtistRoles API Validation Spike~~ → Tidal v2 Credits API Spike (CONFIRMED)

  > **STATUS: SPIKE COMPLETED** — Tidal v2 Credits API confirmed working during planning phase.
  > Real API calls made to album `329293912` (Drake - For All The Dogs Scary Hours Edition).
  > This task now captures the findings and creates the reference document for implementation.

  **What to do**:
  - Create `docs/tidal-credits-spike.md` documenting the CONFIRMED findings from planning-phase API testing
  - Document the working endpoint: `GET /v2/tracks/{trackId}/relationships/credits?include=credits`
  - Document the response structure: `{data: [{id, type: "credits"}], included: [{id, type: "credits", attributes: {name, role}}]}`
  - Document that `included[].attributes.role` contains FREE-FORM role strings (NOT limited to 7 ArtistRoles enum) — observed: Co-Producer, Composer, Drum Kit, Keyboard, Lyricist, Mastering Engineer, Producer, AdditionalProducer, Featured Artist, Mixing, Mixing Engineer, Recording Engineer
  - Document that single credit GET (`/v2/credits/{id}?include=artist,category`) returns 404 with client credentials
  - Document that `include=artist,category` on relationship endpoint doesn't add extra data with client credentials auth
  - Document auth: Tiddl's `client_id=4N3n6Q1x95LL5K7p` works for `grant_type=client_credentials`, token valid 14400s
  - Document the test album: album ID `329293912`, track IDs `329293927`, `329293934`, `329293940`, `329293948`
  - Create a minimal Deno script that demonstrates the working endpoint (for reproducibility)
  - **KEY INSIGHT**: The original assumption was to use `ArtistRoles` (7-role enum) on artist resources. This was WRONG. The actual credits source is the dedicated `/relationships/credits` endpoint, which returns free-form role strings much richer than ArtistRoles.

  **Must NOT do**:
  - Do NOT implement the Tidal provider enhancement yet — this is documentation only
  - Do NOT modify any Harmony source files
  - Do NOT commit API credentials

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Spike is already completed — this is documentation and a minimal repro script, not new research
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES — spike findings are already known, just documenting
  - **Parallel Group**: Wave 0 (can run alongside Wave 1 tasks)
  - **Blocks**: T6 (Tidal provider enhancement uses these findings)
  - **Blocked By**: None

  **References**:

  **Confirmed API Details** (from planning-phase testing):
  - Tidal v2 Credits endpoint: `GET /v2/tracks/{trackId}/relationships/credits?include=credits`
  - Response shape: `{data: [{id, type: "credits"}], included: [{id, type: "credits", attributes: {name, role}}]}`
  - Auth: `POST https://auth.tidal.com/v1/oauth2/token` with `grant_type=client_credentials`, `client_id=4N3n6Q1x95LL5K7p`, `client_secret=oKOXfJW371cX6xaZ0PyhgGNBdNLlBZd4AKKYougMjik=`
  - Token valid 14400s
  - Test album: ID `329293912`, track IDs `329293927`, `329293934`, `329293940`, `329293948`

  **Pattern References** (existing code to follow):
  - `/tmp/harmony/providers/Tidal/v2/lookup.ts` — Current `constructReleaseApiUrl()`, `convertTrack()` — shows how includes are built and how resources are extracted from `included` array
  - `/tmp/harmony/providers/Tidal/v2/api_types.ts:87-95` — `ArtistRoles` type definition (now secondary — Credits API is primary)

  **WHY Each Reference Matters**:
  - `v2/lookup.ts`: Shows the pattern for making Tidal API calls and parsing JSON:API responses — the Credits endpoint follows the same pattern
  - `api_types.ts:87`: ArtistRoles type is now SECONDARY — the Credits API's free-form role strings are the primary data source

  **Acceptance Criteria**:

  - [ ] `docs/tidal-credits-spike.md` created with: working endpoint URL, response structure, free-form role strings observed, auth details, test album IDs, limitations (no single-credit GET, no artist/category with client credentials)
  - [ ] Minimal Deno repro script (`spike.ts`) that demonstrates the working endpoint
  - [ ] Script authenticates with Tidal v2 API and receives a valid Bearer token
  - [ ] Script fetches credits for test album track `329293927` and outputs the credits with roles

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Tidal v2 Credits API spike script works
    Tool: Bash (deno run)
    Preconditions: HARMONY_TIDAL_CLIENT_ID and HARMONY_TIDAL_CLIENT_SECRET env vars set (Tiddl credentials)
    Steps:
      1. Run spike script: `deno run --allow-net --allow-env spike.ts`
      2. Assert script outputs "Auth successful" and shows token expiry
      3. Assert script fetches credits for track 329293927 and outputs at least 1 credit with role
      4. Assert at least one credit has a free-form role string (NOT one of the 7 ArtistRoles enum values)
    Expected Result: Script authenticates, fetches credits, outputs free-form role strings
    Failure Indicators: Auth error (401), API error (4xx/5xx), missing env vars, only ArtistRoles enum values
    Evidence: .sisyphus/evidence/task-1-tidal-credits-api.txt

  Scenario: Spike findings document is complete
    Tool: Bash (file check)
    Preconditions: Spike doc written
    Steps:
      1. Assert `docs/tidal-credits-spike.md` exists
      2. Assert doc contains: endpoint URL, response structure, auth details, observed roles, limitations
    Expected Result: Complete findings document for T6 implementation reference
    Failure Indicators: Missing doc, missing sections
    Evidence: .sisyphus/evidence/task-1-spike-doc.txt
  ```

  **Commit**: YES
  - Message: `spike(tidal): document v2 Credits API for per-track credits`
  - Files: `spike.ts`, `docs/tidal-credits-spike.md`
  - Pre-commit: `deno check spike.ts`

- [x] 2. Extend HarmonyTrack with TrackCredit Type System

  **What to do**:
  - Add `TrackCredit` interface to `/harmonizer/types.ts` with fields: `name`, `creditedName?`, `role`, `originalRole?`, `mbid?`, `externalIds?`, `sources: string[]`
  - Add `credits?: TrackCredit[]` field to `HarmonyTrack` type
  - Update `/harmonizer/properties.ts` — remove `credits` from `immutableReleaseProperties`, add new `combinableTrackProperties` array containing `'credits'`
  - Write TDD tests first:
    - RED: Test that `HarmonyTrack` can have `credits` field with `TrackCredit[]` values
    - RED: Test that `TrackCredit` has required fields (`name`, `role`, `sources`)
    - RED: Test that `TrackCredit` has optional fields (`creditedName`, `originalRole`, `mbid`, `externalIds`)
    - GREEN: Add types to make tests pass
  - Ensure all existing Harmony tests still pass (regression)

  **Must NOT do**:
  - Do NOT change any existing type definitions (backward compatibility)
  - Do NOT change the merge algorithm yet (that's Task 9)
  - Do NOT modify any provider implementations yet (those are Tasks 6-8)
  - Do NOT add `credits` to any provider output yet

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Type system design with TDD, needs careful consideration of backward compatibility and upstream compatibility
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `ai-slop-remover`: Not needed yet — no existing code to clean

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T3, T4, T5 — but T1 should be done first for context)
  - **Parallel Group**: Wave 1
  - **Blocks**: T6, T7, T8, T9 (all provider and merge tasks depend on the type)
  - **Blocked By**: None (can start immediately, but T1 results inform design)

  **References**:

  **Pattern References**:
  - `/tmp/harmony/harmonizer/types.ts:79-90` — Current `HarmonyTrack` type — add `credits?: TrackCredit[]` here
  - `/tmp/harmony/harmonizer/types.ts:92-98` — `ArtistCreditName` type — use as model for `TrackCredit` (similar pattern: name, externalIds, mbid)
  - `/tmp/harmony/harmonizer/properties.ts` — Current property classifications — need to add `combinableTrackProperties`
  - `/tmp/harmony/harmonizer/merge.ts` — Phase 3 custom combinable merge — understand the pattern for future Task 9

  **API/Type References**:
  - `/tmp/harmony/providers/Tidal/v2/api_types.ts:87` — `ArtistRoles` type: the 7-role enum (now SECONDARY — Credits API's free-form role strings are the primary source for Tidal credits)
  - `/tmp/harmony/providers/Discogs/api_types.ts:34-49` — Discogs `Artist` type with `role` and `tracks` fields — the source format for Discogs credits

  **WHY Each Reference Matters**:
  - `types.ts:79-90`: This is exactly where the new field goes — must not break existing fields
  - `properties.ts`: Moving `credits` from immutable to combinable changes merge behavior — must be deliberate
  - `ArtistCreditName`: The existing credit pattern in Harmony — `TrackCredit` should follow this convention for consistency

  **Acceptance Criteria**:

  - [ ] Test file created: `harmonizer/credits_test.ts`
  - [ ] `TrackCredit` interface defined in `harmonizer/types.ts` with required fields (`name`, `role`, `sources`) and optional fields (`creditedName`, `originalRole`, `mbid`, `externalIds`)
  - [ ] `credits?: TrackCredit[]` added to `HarmonyTrack` type
  - [ ] `combinableTrackProperties` array added to `harmonizer/properties.ts` containing `'credits'`
  - [ ] `credits` removed from `immutableReleaseProperties` in `harmonizer/properties.ts`
  - [ ] `deno test harmonizer/credits_test.ts` → PASS (4+ tests, 0 failures)
  - [ ] `deno test` → ALL existing tests still pass (0 regressions)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: TrackCredit type accepts valid data
    Tool: Bash (deno test)
    Preconditions: Type system changes committed
    Steps:
      1. Run `deno test harmonizer/credits_test.ts`
      2. Assert all tests pass
      3. Run `deno check harmonizer/types.ts` — no type errors
    Expected Result: All new tests pass, types check clean
    Failure Indicators: Type errors, test failures, missing fields
    Evidence: .sisyphus/evidence/task-2-type-check.txt

  Scenario: No regressions in existing Harmony
    Tool: Bash (deno test)
    Preconditions: Type changes applied
    Steps:
      1. Run full test suite: `deno test`
      2. Assert 0 test failures
      3. Run type checker: `deno check **/*.ts`
    Expected Result: All existing tests pass, no type errors
    Failure Indicators: Any test that previously passed now fails
    Evidence: .sisyphus/evidence/task-2-regression.txt
  ```

  **Commit**: YES
  - Message: `feat(harmonizer): extend HarmonyTrack with TrackCredit type system`
  - Files: `harmonizer/types.ts`, `harmonizer/properties.ts`, `harmonizer/credits_test.ts`
  - Pre-commit: `deno test && deno check **/*.ts`

- [x] 3. Unified Credit→MB Role Mapping Table (Tidal + Discogs)

  **What to do**:
  - Create a comprehensive TypeScript mapping table that converts BOTH Tidal and Discogs free-form role strings to MusicBrainz relationship type IDs and attribute type IDs
  - **Tidal roles to map** (confirmed from Credits API testing on album `329293912`): Co-Producer, Composer, Drum Kit, Keyboard, Lyricist, Mastering Engineer, Producer, AdditionalProducer, Featured Artist, Mixing, Mixing Engineer, Recording Engineer
  - **Discogs roles to map** (common free-form roles): Produced By, Co-Produced By, Executive Producer, Engineer, Mixed By, Mastered By, Recorded By, Songwriter, Composer, Lyricist, Performer (with instrument brackets), Remixer, DJ Mixer, Arranger, Orchestrator, Editor, Programming
  - Each mapping entry: `{ sourceRole: string, mbRelationshipType: string, mbRelationshipId: string, mbAttributes?: Array<{type: string, typeId: string}> }`
  - **CONFIRMED MB relationship type UUIDs** (from MB server SQL and relationship docs):
    - producer=`5c0ceac3-feb4-41f0-868d-dc06f6e27fc0`, engineer=`5dcc52af-7064-4051-8d62-7d80f4c3c907`, mixer=`3e3102e1-1896-4f50-b5b2-dd9824e46efe`, mastering=`8c9b9e5e-59e9-4d4c-9609-039c8e4f061d`, recording=`6e6e9a6e-1ee4-4b8d-ba4f-e7cc1a8473e5`, co-producer=`c9465eb4-47ea-4d9b-8585-2d5e44a4e1c0`, additional=`2a5ed3a7-5c3f-4248-b205-847c1e7f4c71`, arranger=`5c0ceac3-feb4-41f0-868d-dc06f6e27fc0` (with arranger attribute), performer=`28e41040-6cbf-428d-b561-4e0c59a0e7b6`, instruments=`fd0731c3-6fff-4516-9a22-8fe8c6e4a7a6`, vocalist=`d3a8e3f3-6371-4345-8c3c-797c4a6c14d3`
  - **CONFIRMED MB attribute type UUIDs** (from `t/sql/initial.sql`):
    - additional=`0a5341f8-3b1d-4f99-a0c6-26b7f4e42c7f`, co=`ac6f6b4c-a4ec-4483-a04e-9f425a914573`, guest=`b3045913-62ac-433e-9211-ac683cdf6b5c`, solo=`1c186ed2-8932-424b-8d69-0e8f4f8be8b0`, keyboard=`95b0c3d2-9606-4ef5-a019-9b7437f3adda`, drums=`3bccb7eb-cbca-42cd-b0ac-a5e959df7221`
  - Handle bracket notation: "Guitar [Electric]" → MB performer→guitar with instrument attribute
  - Handle compound roles: "Produced By, Mixed By" → split into two mappings
  - Handle unmappable roles: preserve original string, flag for manual review
  - **Handle "Featured Artist" from Tidal**: Map to MB performer with `guest` attribute (`b3045913-62ac-433e-9211-ac683cdf6b5c`)
  - **Handle "AdditionalProducer" from Tidal**: Map to MB producer with `additional` attribute (`0a5341f8-3b1d-4f99-a0c6-26b7f4e42c7f`)
  - **Handle "Co-Producer" from Tidal**: Map to MB producer with `co` attribute (`ac6f6b4c-a4ec-4483-a04e-9f425a914573`)
  - **Handle "Mixing" vs "Mixing Engineer" from Tidal**: Both map to MB mixer (`3e3102e1-1896-4f50-b5b2-dd9824e46efe`)
  - **Work-level caveat**: Document that Composer/Lyricist are work→artist in MB (NOT recording→artist). v1 should skip these for injection or require Work entity lookup.
  - Write TDD tests:
    - RED: Test that Tidal "Producer" maps to MB producer relationship
    - RED: Test that Tidal "Featured Artist" maps to MB performer with guest attribute
    - RED: Test that Tidal "AdditionalProducer" maps to MB producer with additional attribute
    - RED: Test that Discogs "Produced By" maps to MB producer relationship
    - RED: Test that "Guitar [Electric]" maps to performer→guitar with electric attribute
    - RED: Test that unmappable roles are preserved with a flag
    - GREEN: Implement mapping table

  **Must NOT do**:
  - Do NOT implement the Tidal/Discogs provider enhancements yet (those are Tasks 6-7)
  - Do NOT add MB relationship creation yet (that's Task 12)
  - Do NOT try to map EVERY possible role — cover the top 30-50 most common ones plus all confirmed Tidal roles

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Domain knowledge task — requires understanding Tidal, Discogs, AND MB taxonomies, careful mapping with confirmed UUIDs and edge cases (work-level vs recording-level)
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T2, T4, T5)
  - **Parallel Group**: Wave 1
  - **Blocks**: T6 (Tidal provider), T7 (Discogs provider), T12 (MB injection)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `/tmp/harmony/providers/Discogs/api_types.ts:34-49` — Discogs `Artist` type with `role: string` and `tracks: string` fields
  - `/tmp/harmony/musicbrainz/seeding.ts` — Existing MB seeding code — shows relationship type handling

  **External References**:
  - MB Artist-Recording relationship types: https://musicbrainz.org/relationships/artist-recording
  - **CONFIRMED MB relationship type UUIDs**: producer=`5c0ceac3-feb4-41f0-868d-dc06f6e27fc0`, engineer=`5dcc52af-7064-4051-8d62-7d80f4c3c907`, mixer=`3e3102e1-1896-4f50-b5b2-dd9824e46efe`, mastering=`8c9b9e5e-59e9-4d4c-9609-039c8e4f061d`, recording=`6e6e9a6e-1ee4-4b8d-ba4f-e7cc1a4e1c0` (full list in `docs/tidal-credits-spike.md`)
  - **CONFIRMED MB attribute type UUIDs** (from `/tmp/mb-server/t/sql/initial.sql`): additional=`0a5341f8-3b1d-4f99-a0c6-26b7f4e42c7f`, co=`ac6f6b4c-a4ec-4483-a04e-9f425a914573`, guest=`b3045913-62ac-433e-9211-ac683cdf6b5c`, solo=`1c186ed2-8932-424b-8d69-0e8f4f8be8b0`, keyboard=`95b0c3d2-9606-4ef5-a019-9b7437f3adda`, drums=`3bccb7eb-cbca-42cd-b0ac-a5e959df7221`
  - Discogs role conventions: https://www.discogs.com/help/submission-guidelines-release-credits.html
  - MB URL seeding format (from `/tmp/mb-server/lib/MusicBrainz/Server/Controller/Role/EditRelationships.pm:90-296`): `rels.{N}.type`, `rels.{N}.target`, `rels.{N}.attributes.{M}.type`

  **WHY Each Reference Matters**:
  - Discogs `Artist.role` is free-form text — the mapping table must handle the most common patterns
  - MB relationship IDs are UUIDs needed for programmatic injection (Task 12) — these are CONFIRMED from server source
  - MB attribute UUIDs are needed for `rels.{N}.attributes.{M}.type` form fields in injection
  - Bracket notation parsing is critical for instrument credits
  - Work-level caveat for Composer/Lyricist must be documented — these are NOT recording-level in MB

  **Acceptance Criteria**:

  - [ ] Test file: `mirmir/role_mapping_test.ts`
  - [ ] Mapping table: `mirmir/role_mapping.ts` with 30+ role→MB mappings covering BOTH Tidal and Discogs
  - [ ] All confirmed Tidal roles mapped: Co-Producer, Composer, Drum Kit, Keyboard, Lyricist, Mastering Engineer, Producer, AdditionalProducer, Featured Artist, Mixing, Mixing Engineer, Recording Engineer
  - [ ] `deno test mirmir/role_mapping_test.ts` → PASS (10+ tests)
  - [ ] Bracket notation parsing handles "Guitar [Electric]", "Vocals [Backing]", "Piano [Rhodes]"
  - [ ] Compound role splitting handles "Produced By, Mixed By"
  - [ ] Unmappable roles flagged with `unmappable: true`
  - [ ] "Featured Artist" → performer with guest attribute (UUID `b3045913-62ac-433e-9211-ac683cdf6b5c`)
  - [ ] "AdditionalProducer" → producer with additional attribute (UUID `0a5341f8-3b1d-4f99-a0c6-26b7f4e42c7f`)
  - [ ] "Co-Producer" → producer with co attribute (UUID `ac6f6b4c-a4ec-4483-a04e-9f425a914573`)
  - [ ] Composer/Lyricist marked as work-level (skip for recording-level injection in v1)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Common Tidal and Discogs roles map correctly
    Tool: Bash (deno test)
    Preconditions: Role mapping table implemented
    Steps:
      1. Run `deno test mirmir/role_mapping_test.ts`
      2. Assert all tests pass
      3. Specifically assert Tidal: "Producer" → MB producer, "Featured Artist" → performer+guest, "AdditionalProducer" → producer+additional, "Co-Producer" → producer+co
      4. Specifically assert Discogs: "Produced By" → MB producer, "Mixed By" → MB mix engineer, "Mastered By" → MB mastering
    Expected Result: 10+ tests pass covering both Tidal and Discogs role mappings
    Failure Indicators: Incorrect MB type IDs, missing mappings, type errors, wrong attribute UUIDs
    Evidence: .sisyphus/evidence/task-3-role-mapping.txt

  Scenario: Bracket notation parsing works
    Tool: Bash (deno test)
    Preconditions: Bracket parsing implemented
    Steps:
      1. Test "Guitar [Electric]" parses to role="performer", instrument="guitar", attribute="electric"
      2. Test "Vocals [Backing]" parses to role="performer", instrument="vocals", attribute="backing"
      3. Test "Piano" (no brackets) parses to role="performer", instrument="piano"
    Expected Result: All bracket notation cases handled correctly
    Failure Indicators: Parsing errors, missing attributes, wrong instrument names
    Evidence: .sisyphus/evidence/task-3-bracket-parsing.txt

  Scenario: Work-level roles correctly flagged
    Tool: Bash (deno test)
    Preconditions: Work-level flagging implemented
    Steps:
      1. Test "Composer" → flagged as work-level (skip for recording injection)
      2. Test "Lyricist" → flagged as work-level (skip for recording injection)
      3. Test "Producer" → NOT flagged as work-level (recording-level, OK to inject)
    Expected Result: Work-level roles correctly identified and separated
    Failure Indicators: Composer/Lyricist not flagged, Producer incorrectly flagged
    Evidence: .sisyphus/evidence/task-3-work-level.txt
  ```

  **Commit**: YES
  - Message: `feat(mirmir): add unified Tidal+Discogs→MB role mapping table with confirmed UUIDs`
  - Files: `mirmir/role_mapping.ts`, `mirmir/role_mapping_test.ts`
  - Pre-commit: `deno test mirmir/role_mapping_test.ts`

- [x] 4. Harmony Test Infrastructure Setup for Mirmir

  **What to do**:
  - Create test fixtures (snapshot files) from real API responses for releases with rich per-track credits
  - Use Tidal album `329293912` (Drake - For All The Dogs Scary Hours Edition, CONFIRMED with Credits API data from T1 spike) — capture full Credits API response
  - Use a Discogs release with rich extraartists (e.g., release with per-track producer/engineer credits)
  - Use a MusicBrainz release with existing artist-recording relationships
  - Store snapshots in `mirmir/test/fixtures/` following Harmony's snapshot pattern
  - Create a test helper module `mirmir/test/helpers.ts` for loading fixtures and creating mock provider instances
  - Configure Deno test runner for mirmir-specific tests

  **Must NOT do**:
  - Do NOT modify Harmony's existing test infrastructure
  - Do NOT use live API calls in tests — only snapshots/fixtures
  - Do NOT include API credentials in fixtures

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Infrastructure setup, well-defined task, follows Harmony's existing patterns
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T2, T3, T5)
  - **Parallel Group**: Wave 1
  - **Blocks**: None directly (but provides test infrastructure for later tasks)
  - **Blocked By**: T1 (Tidal fixtures may need spike findings)

  **References**:

  **Pattern References**:
  - `/tmp/harmony/providers/Tidal/__snapshots__/mod.test.ts.snap` — Existing snapshot format and structure
  - `/tmp/harmony/providers/Discogs/__snapshots__/mod.test.ts.snap` — Existing Discogs snapshot format
  - `/tmp/harmony/providers/Tidal/mod.test.ts` — Test patterns using snapshots
  - `/tmp/harmony/deno.json` — Deno test configuration

  **WHY Each Reference Matters**:
  - Snapshot format: Must match Harmony's format for compatibility
  - Test patterns: Follow existing patterns for consistency

  **Acceptance Criteria**:

  - [ ] `mirmir/test/fixtures/` directory created with at least 3 fixture files (Tidal, Discogs, MB)
  - [ ] `mirmir/test/helpers.ts` module created with fixture loading and mock provider creation utilities
  - [ ] `deno test mirmir/test/` → PASS (helper module loads fixtures correctly)
  - [ ] Fixtures include releases with rich per-track credits data

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Test fixtures load correctly
    Tool: Bash (deno test)
    Preconditions: Fixtures created
    Steps:
      1. Run `deno test mirmir/test/`
      2. Assert helper module loads Tidal fixture and parses track listing
      3. Assert helper module loads Discogs fixture and parses extraartists
      4. Assert helper module loads MB fixture and parses relationships
    Expected Result: All fixtures load and parse without errors
    Failure Indicators: Missing files, JSON parse errors, wrong fixture structure
    Evidence: .sisyphus/evidence/task-4-fixtures.txt
  ```

  **Commit**: YES
  - Message: `chore(test): set up mirmir test infrastructure with Deno`
  - Files: `mirmir/test/fixtures/`, `mirmir/test/helpers.ts`, `mirmir/test/helpers_test.ts`
  - Pre-commit: `deno test mirmir/test/`

- [x] 5. Docker Development Environment

  **What to do**:
  - Create `Dockerfile` based on `denoland/deno:alpine` for mirmir
  - Create `docker-compose.yml` for local development (mirmir + optional Redis for caching)
  - Create `.env.example` with all required env vars: Tidal client ID/secret, Discogs consumer key/secret, MB bot account credentials (optional for dev)
  - Ensure `deno task dev` works inside Docker container with hot-reload
  - Test that the Harmony web app runs inside the container on port 3000

  **Must NOT do**:
  - Do NOT add PostgreSQL to Docker config (deferred to v1.5)
  - Do NOT include production secrets
  - Do NOT modify Harmony's existing Dockerfile (if any)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard Docker setup, well-defined, follows Deno Docker patterns
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T2, T3, T4)
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `/tmp/harmony/deno.json` — Deno tasks and configuration
  - `/home/djdembeck/projects/github/mirmir/Dockerfile` — Original mirmir Dockerfile (Ruby-based, for reference only)

  **External References**:
  - Deno Docker: https://deno.land/manual@v1.40.0/getting_started/docker

  **Acceptance Criteria**:

  - [ ] `Dockerfile` created, builds successfully with `docker build -t mirmir .`
  - [ ] `docker-compose.yml` created with mirmir service
  - [ ] `.env.example` created with all required env vars documented
  - [ ] `docker compose up` starts mirmir and serves on `localhost:3000`
  - [ ] Harmony web UI loads in browser at `localhost:3000`

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Docker container builds and runs
    Tool: Bash (docker)
    Preconditions: Docker installed
    Steps:
      1. Run `docker build -t mirmir .`
      2. Run `docker compose up -d`
      3. Wait 10 seconds for startup
      4. Run `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`
      5. Assert HTTP 200
    Expected Result: Container builds, starts, and serves HTTP 200
    Failure Indicators: Build failure, container exits, HTTP error
    Evidence: .sisyphus/evidence/task-5-docker.txt
  ```

  **Commit**: YES
  - Message: `chore(docker): add development Docker environment`
  - Files: `Dockerfile`, `docker-compose.yml`, `.env.example`
  - Pre-commit: `docker build -t mirmir .`

- [ ] 6. Tidal Provider: Extract Per-Track Credits via Credits API

  **What to do**:
  - Extend `/providers/Tidal/v2/lookup.ts` to extract per-track credits using the CONFIRMED Credits API endpoint
  - After fetching a release's tracks, make additional `GET /v2/tracks/{trackId}/relationships/credits?include=credits` calls for each track
  - Parse the JSON:API response: `{data: [{id, type: "credits"}], included: [{id, type: "credits", attributes: {name, role}}]}`
  - Map each `included` entry to a `TrackCredit`: `name=attributes.name`, `role=attributes.role`, `sources=["Tidal"]`, `externalIds={tidalCreditId: included.id}`
  - **Tidal Credits API returns free-form role strings** (NOT the 7 ArtistRoles enum) — use the role strings as-is for `role` field, store the raw string in `originalRole` too
  - Use the unified role mapping table from T3 to normalize roles where possible (e.g., "Co-Producer" → "producer" with co attribute)
  - **Rate limiting**: Fetch credits sequentially per track (not parallel) to respect Tidal API limits. Batch all track credit fetches after the initial release lookup.
  - **Graceful degradation**: If a track's credits endpoint returns empty or errors, continue processing other tracks. Log warnings for failed track credit fetches.
  - Write TDD tests against fixtures from T4 (use test album `329293912` fixture)
  - Add new Tidal API type for the Credits response in `api_types.ts`

  **Must NOT do**:
  - Do NOT change existing Tidal provider behavior for non-credits fields
  - Do NOT break existing Tidal tests
  - Do NOT fetch credits in parallel (respect rate limits)
  - Do NOT use the ArtistRoles enum as the primary credits source — the Credits API is the primary source
  - Do NOT attempt single-credit GET (`/v2/credits/{id}`) — it returns 404 with client credentials

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: API integration with confirmed endpoint, needs careful rate limiting, graceful degradation, and JSON:API parsing
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T7, T8, T9)
  - **Parallel Group**: Wave 2
  - **Blocks**: T10
  - **Blocked By**: T1 (spike findings/doc), T2 (TrackCredit type), T3 (role mapping table)

  **References**:

  **Pattern References**:
  - `/tmp/harmony/providers/Tidal/v2/lookup.ts:260-276` — `convertTrack()` method — add credit extraction here after initial track conversion
  - `/tmp/harmony/providers/Tidal/v2/lookup.ts:278-293` — `getArtists()` method — extend to include role data
  - `/tmp/harmony/providers/Tidal/v2/lookup.ts:55-83` — `constructReleaseApiUrl()` — understand the existing include parameter pattern

  **API/Type References**:
  - **CONFIRMED Credits API endpoint**: `GET /v2/tracks/{trackId}/relationships/credits?include=credits`
  - **CONFIRMED Response shape**: `{data: [{id, type: "credits"}], included: [{id, type: "credits", attributes: {name, role}}]}`
  - **CONFIRMED Auth**: `POST https://auth.tidal.com/v1/oauth2/token` with `grant_type=client_credentials`
  - `/tmp/harmony/providers/Tidal/v2/api_types.ts:87` — `ArtistRoles` type (SECONDARY — Credits API is primary)
  - `docs/tidal-credits-spike.md` (from T1) — Full endpoint documentation and observed role strings
  - `mirmir/role_mapping.ts` (from T3) — Role normalization for Tidal free-form role strings

  **Test References**:
  - Test album: Tidal album ID `329293912`, track IDs `329293927`, `329293934`, `329293940`, `329293948`
  - Observed roles on this album: Co-Producer, Composer, Drum Kit, Keyboard, Lyricist, Mastering Engineer, Producer, AdditionalProducer, Featured Artist, Mixing, Mixing Engineer, Recording Engineer

  **WHY Each Reference Matters**:
  - `convertTrack()`: This is where TrackCredit[] gets attached to each HarmonyTrack — after initial conversion, make additional Credits API call per track
  - Credits API endpoint: CONFIRMED working — no need for experimental include params on album endpoint
  - Spike doc: The exact response structure and observed roles to validate against
  - Role mapping: Normalizes free-form Tidal role strings to MB-compatible types

  **Acceptance Criteria**:

  - [ ] Tidal provider extracts per-track `TrackCredit[]` from Credits API responses
  - [ ] Each `TrackCredit` has `name`, `role` (normalized via T3 mapping), `originalRole` (raw Tidal string), `sources: ["Tidal"]`, and `externalIds`
  - [ ] Credits API type added to `api_types.ts` for Credits response shape
  - [ ] Sequential credit fetching per track (rate limiting)
  - [ ] Graceful degradation: empty/failed credit fetches don't break the release lookup
  - [ ] `deno test providers/Tidal/` → PASS (including new credit tests)
  - [ ] Existing Tidal tests still pass (0 regressions)
  - [ ] Test with album `329293912`: credits array is populated with expected roles (Producer, Co-Producer, etc.)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Tidal provider extracts credits from Credits API
    Tool: Bash (deno test)
    Preconditions: T1 spike doc available, T2 types defined, T3 role mapping available, T4 fixtures available
    Steps:
      1. Run `deno test providers/Tidal/`
      2. Assert new credit extraction tests pass
      3. Assert credits are attached to HarmonyTrack objects
      4. Assert each credit has name, role, originalRole, sources=["Tidal"]
      5. Assert free-form role strings are preserved in originalRole
    Expected Result: All tests pass, credits populated from Tidal Credits API
    Failure Indicators: Empty credits array, missing fields, test failures, ArtistRoles-only roles
    Evidence: .sisyphus/evidence/task-6-tidal-credits.txt

  Scenario: Graceful degradation when credits endpoint fails
    Tool: Bash (deno test)
    Preconditions: Provider changes applied
    Steps:
      1. Test with a track that returns empty credits response
      2. Assert provider does NOT throw an error
      3. Assert other tracks still have their credits populated
      4. Assert warning is logged for failed track
    Expected Result: Provider continues with partial credits, no crash
    Failure Indicators: Unhandled error, all credits missing due to one track failure
    Evidence: .sisyphus/evidence/task-6-graceful-degradation.txt

  Scenario: No regression in existing Tidal functionality
    Tool: Bash (deno test)
    Preconditions: Tidal provider changes applied
    Steps:
      1. Run full Tidal test suite: `deno test providers/Tidal/`
      2. Assert ALL tests pass (old and new)
    Expected Result: All tests pass, no regressions
    Failure Indicators: Previously passing tests now fail
    Evidence: .sisyphus/evidence/task-6-tidal-regression.txt
  ```

  **Commit**: YES
  - Message: `feat(tidal): extract per-track credits via Credits API`
  - Files: `providers/Tidal/v2/lookup.ts`, `providers/Tidal/v2/api_types.ts`, test files
  - Pre-commit: `deno test providers/Tidal/`

- [ ] 7. Discogs Provider: Extract Extraartists Per-Track Credits with Role Mapping

  **What to do**:
  - Extend `/providers/Discogs/mod.ts` to extract per-track `extraartists` from Discogs API responses
  - Parse release-level `extraartists` that have `tracks` field (track ranges like "1, 3-5, 7") and distribute them to the appropriate tracks
  - Parse track-level `extraartists` (per-track credit lists) from each track in the tracklist
  - Use the role mapping table from T3 to convert Discogs free-form roles to normalized MB-compatible role strings
  - Preserve `originalRole` field on TrackCredit (the raw Discogs role string like "Produced By")
  - Handle track range parsing: "1, 3-5" → tracks 1, 3, 4, 5; "A1-A3" → vinyl positions
  - Populate `TrackCredit.sources` with `["Discogs"]`
  - Populate `TrackCredit.creditedName` with Discogs Artist Name Variation (ANV) when available
  - Write TDD tests against fixtures from T4

  **Must NOT do**:
  - Do NOT change existing Discogs provider behavior for non-credits fields
  - Do NOT break existing Discogs tests
  - Do NOT add role mapping logic inline — use the mapping table from T3

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex parsing (track ranges, ANVs, compound roles) plus integration with mapping table
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T6, T8, T9)
  - **Parallel Group**: Wave 2
  - **Blocks**: T10
  - **Blocked By**: T2 (TrackCredit type), T3 (role mapping table)

  **References**:

  **Pattern References**:
  - `/tmp/harmony/providers/Discogs/mod.ts` — Existing Discogs provider, `convertRelease()`, track conversion logic
  - `/tmp/harmony/providers/Discogs/api_types.ts:34-49` — Discogs `Artist` type with `role`, `tracks`, `anv` fields
  - `/tmp/harmony/providers/Discogs/api_types.ts:67-79` — Discogs `Track` type with `extraartists?: Artist[]`
  - `/tmp/harmony/providers/Discogs/tracklist.ts` — Existing tracklist parsing (position format handling)

  **API/Type References**:
  - `mirmir/role_mapping.ts` (from T3) — Unified role mapping table for converting Discogs (and Tidal) roles to MB types

  **WHY Each Reference Matters**:
  - `mod.ts`: Where the Discogs provider processes API responses — must add extraartists extraction
  - `api_types.ts:34-49`: The Discogs Artist type has `role` (free-form) and `tracks` (track ranges) — these are the key fields for credits
  - `tracklist.ts`: Already handles Discogs position format — extend for track range parsing

  **Acceptance Criteria**:

  - [ ] Discogs provider extracts per-track `TrackCredit[]` from both track-level and release-level `extraartists`
  - [ ] Track ranges parsed correctly: "1, 3-5, 7" distributes credits to correct tracks
  - [ ] Discogs role strings mapped to normalized roles via T3 mapping table
  - [ ] `originalRole` preserves the raw Discogs role string
  - [ ] `creditedName` populated from Discogs ANV when available
  - [ ] `deno test providers/Discogs/` → PASS (including new credit tests)
  - [ ] Existing Discogs tests still pass (0 regressions)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Discogs extraartists extracted per-track
    Tool: Bash (deno test)
    Preconditions: T2 types, T3 mapping, T4 fixtures available
    Steps:
      1. Run `deno test providers/Discogs/`
      2. Assert extraartists are extracted and attached to tracks
      3. Assert roles are normalized (e.g., "Produced By" → "producer")
      4. Assert originalRole is preserved
    Expected Result: Credits extracted with normalized and original roles
    Failure Indicators: Missing credits, unmapped roles, parse errors
    Evidence: .sisyphus/evidence/task-7-discogs-credits.txt

  Scenario: Track range parsing works
    Tool: Bash (deno test)
    Preconditions: Track range parser implemented
    Steps:
      1. Test "1, 3-5, 7" → [1, 3, 4, 5, 7]
      2. Test "A1-A3" → ["A1", "A2", "A3"]
      3. Test "" (empty) → all tracks (release-level credit)
    Expected Result: All track range formats parsed correctly
    Failure Indicators: Incorrect track numbers, parse errors
    Evidence: .sisyphus/evidence/task-7-track-ranges.txt
  ```

  **Commit**: YES
  - Message: `feat(discogs): extract extraartists per-track credits with role mapping`
  - Files: `providers/Discogs/mod.ts`, test files
  - Pre-commit: `deno test providers/Discogs/`

- [ ] 8. MusicBrainz Provider: Read Existing Artist-Recording Relationships

  **What to do**:
  - Extend the MusicBrainz provider (or create a new MB credits module) to fetch existing artist-recording relationships for a release's tracks
  - Use MB API: `GET /ws/2/recording/{mbid}?inc=artist-rels+work-rels&fmt=json` for each track
  - Respect MB rate limit: 1 request/second (implement proper rate limiting)
  - Convert MB relationships to `TrackCredit[]` format: `relation.type` → `role`, `artist.name` → `name`, `artist.id` → `mbid`
  - Map MB relationship type names to normalized role strings (e.g., "producer" → "Producer", "mix engineer" → "Mix Engineer")
  - Populate `TrackCredit.sources` with `["MusicBrainz"]`
  - This should be an OPTIONAL step — triggered by a "Check existing MB credits" button, not automatic on every lookup
  - Write TDD tests against MB API fixture snapshots

  **Must NOT do**:
  - Do NOT make MB credit fetching automatic on every release lookup (respects rate limits)
  - Do NOT modify existing MusicBrainz provider behavior
  - Do NOT implement MB relationship creation yet (that's Task 12)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: MB API integration with rate limiting, relationship type mapping, and optional trigger design
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T6, T7, T9)
  - **Parallel Group**: Wave 2
  - **Blocks**: T10
  - **Blocked By**: T2 (TrackCredit type)

  **References**:

  **Pattern References**:
  - `/tmp/harmony/providers/base.ts` — `MetadataApiProvider` base class with rate limiting
  - `/tmp/harmony/musicbrainz/mbid_mapping.ts` — Existing MB API interaction patterns
  - `@kellnerd/musicbrainz` package — Existing MB client used by Harmony

  **API References**:
  - MB API: `GET /ws/2/recording/{mbid}?inc=artist-rels+work-rels&fmt=json`
  - MB Rate limit: 1 req/sec, requires meaningful User-Agent header
  - MB Relationship types: https://musicbrainz.org/relationships/artist-recording

  **WHY Each Reference Matters**:
  - `base.ts`: Rate limiting pattern to follow for MB's strict 1 req/sec limit
  - `mbid_mapping.ts`: Shows how Harmony already interacts with MB API

  **Acceptance Criteria**:

  - [ ] MB credits module fetches artist-recording relationships for a release's tracks
  - [ ] Rate limited to 1 req/sec
  - [ ] MB relationships converted to `TrackCredit[]` with correct role mapping
  - [ ] `TrackCredit.sources` = `["MusicBrainz"]`
  - [ ] `TrackCredit.mbid` populated from MB artist IDs
  - [ ] `deno test mirmir/mb_credits_test.ts` → PASS
  - [ ] Triggered via UI button, not automatic

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: MB credits fetched for release tracks
    Tool: Bash (deno test)
    Preconditions: MB fixture snapshots available, T2 types defined
    Steps:
      1. Run `deno test mirmir/mb_credits_test.ts`
      2. Assert MB relationships are converted to TrackCredit[]
      3. Assert rate limiting is enforced (1 req/sec)
      4. Assert mbid field is populated on each credit
    Expected Result: All tests pass, credits have MBIDs
    Failure Indicators: Missing relationships, rate limit violations, empty credits
    Evidence: .sisyphus/evidence/task-8-mb-credits.txt
  ```

  **Commit**: YES
  - Message: `feat(musicbrainz): read existing artist-recording relationships`
  - Files: `mirmir/mb_credits.ts`, `mirmir/mb_credits_test.ts`
  - Pre-commit: `deno test mirmir/mb_credits_test.ts`

- [ ] 9. Combinable Credit Merge Algorithm

  **What to do**:
  - Implement a custom merge function for track credits in `/harmonizer/merge.ts`
  - The merge should be combinable (union from all providers), NOT first-wins
  - Deduplicate credits by normalized (name, role) pair — same person with same role from multiple sources = one credit with multiple sources
  - Union `sources` arrays when deduplicating (e.g., "John" as "Producer" from both Tidal and Discogs → `sources: ["Tidal", "Discogs"]`)
  - Union `externalIds` when deduplicating (merge provider-specific IDs from all sources)
  - Keep the most specific `creditedName` if sources differ
  - Add credits to the Phase 3 custom combinable merge section of the merge algorithm
  - Write TDD tests:
    - RED: Test merging credits from 2 providers for the same track
    - RED: Test deduplication of same person/role across providers
    - RED: Test that different roles from different providers are all kept
    - GREEN: Implement merge logic

  **Must NOT do**:
  - Do NOT change existing merge behavior for non-credits properties
  - Do NOT remove the release-level `credits?: string` field (backward compatibility)
  - Do NOT add source ranking or conflict detection in v1 (defer to v2)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Core algorithm design with deduplication logic, needs careful edge case handling
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T6, T7, T8)
  - **Parallel Group**: Wave 2
  - **Blocks**: T10
  - **Blocked By**: T2 (TrackCredit type and combinableTrackProperties)

  **References**:

  **Pattern References**:
  - `/tmp/harmony/harmonizer/merge.ts:178-211` — Phase 3 custom combinable merge section — add credit merge here
  - `/tmp/harmony/harmonizer/merge.ts:230-250` — External ID merging pattern (union + dedup by ID) — follow this pattern
  - `/tmp/harmony/harmonizer/properties.ts` — `combinableTrackProperties` list added in T2

  **WHY Each Reference Matters**:
  - Phase 3 is where custom combinable merge logic goes — credit merge belongs here
  - External ID merging shows the exact deduplication pattern to follow

  **Acceptance Criteria**:

  - [ ] `mergeTrackCredits()` function implemented in `harmonizer/merge.ts`
  - [ ] Credits from multiple providers are unioned per track
  - [ ] Same person/role from different sources deduplicated with merged `sources` and `externalIds`
  - [ ] Different roles from different sources all preserved
  - [ ] `deno test harmonizer/merge_test.ts` → PASS (including new credit merge tests)
  - [ ] Existing merge tests still pass (0 regressions)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Credits merged from multiple providers
    Tool: Bash (deno test)
    Preconditions: T2 types, merge algorithm implemented
    Steps:
      1. Run `deno test harmonizer/merge_test.ts`
      2. Assert: Tidal "Producer: John" + Discogs "Producer: John" → single credit with sources=["Tidal","Discogs"]
      3. Assert: Tidal "Producer: John" + Discogs "Mixer: Bob" → two credits, both preserved
      4. Assert: Same person different role → two separate credits
    Expected Result: All merge tests pass, credits correctly combined
    Failure Indicators: Duplicate credits, lost credits, wrong sources
    Evidence: .sisyphus/evidence/task-9-credit-merge.txt

  Scenario: No regression in existing merge behavior
    Tool: Bash (deno test)
    Preconditions: Merge changes applied
    Steps:
      1. Run full test suite: `deno test`
      2. Assert 0 failures
    Expected Result: All existing tests pass
    Failure Indicators: Any previously passing test now fails
    Evidence: .sisyphus/evidence/task-9-regression.txt
  ```

  **Commit**: YES
  - Message: `feat(harmonizer): combinable credit merge algorithm`
  - Files: `harmonizer/merge.ts`, `harmonizer/merge_test.ts`
  - Pre-commit: `deno test`

- [ ] 10. Credit-Focused Web UI — Per-Track View

  **What to do**:
  - Create a new Fresh island (interactive Preact component) for per-track credit display
  - Design follows the original mirmir's card-per-track layout (Bulma-style cards) but using Harmony's Preact + Fresh stack
  - Each track rendered as a card showing: track number, title, duration, and credits grouped by role
  - Each credit group shows role name as header, then list of contributor names with source badges (Tidal, Discogs, MB)
  - Names are clickable/selectable for copy (like the original mirmir's `onclick="copyElementText(this.id)"`)
  - Integrate into Harmony's existing release page — add a "Credits" tab/section below or alongside the existing release info
  - Show source provenance: which provider contributed each credit (color-coded badges or labels)
  - Handle empty state gracefully: "No credits found for this release"
  - Support the "Check existing MB credits" button that triggers T8's MB credit fetch

  **Must NOT do**:
  - Do NOT replace Harmony's existing release page — ADD credits section to it
  - Do NOT implement the injection flow yet (that's T13)
  - Do NOT add the common contributors view (that's T11)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI component design with Preact, Fresh islands, credit data rendering
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T11 after T10, T12)
  - **Parallel Group**: Wave 3
  - **Blocks**: T11, T13
  - **Blocked By**: T6, T7, T9 (need credits from providers + merge)

  **References**:

  **Pattern References**:
  - `/home/djdembeck/projects/github/mirmir/app/views/sources/show.html.erb` — Original mirmir UI: card-per-track layout, role-grouped credits, copy-on-click names
  - `/tmp/harmony/server/islands/` — Existing Fresh islands (interactive Preact components)
  - `/tmp/harmony/server/routes/release.tsx` — Existing release page route handler

  **WHY Each Reference Matters**:
  - Original mirmir UI: Proven UX pattern for credit display — the card-per-track with role grouping worked well
  - Fresh islands: The Preact component pattern for interactive UI elements
  - Release route: Where to integrate the credits section into Harmony's existing page

  **Acceptance Criteria**:

  - [ ] New Fresh island component renders per-track credits on the release page
  - [ ] Credits grouped by role with contributor names listed
  - [ ] Source badges/labels on each credit showing provenance
  - [ ] Names are selectable/copyable
  - [ ] "Check existing MB credits" button triggers MB credit fetch (T8)
  - [ ] Empty state handled: "No credits found"
  - [ ] Visual regression test: screenshot matches expected layout

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Per-track credits display correctly
    Tool: Playwright
    Preconditions: Docker container running, test release loaded with credits
    Steps:
      1. Navigate to `http://localhost:3000` 
      2. Search for a release with credits (e.g., a known Tidal album ID)
      3. Wait for credits section to render (timeout: 10s)
      4. Assert: credit cards are visible (selector: `.track-credit-card`)
      5. Assert: role headers visible (e.g., "Producer", "Engineer")
      6. Assert: contributor names visible within role groups
      7. Assert: source badges visible (e.g., "Tidal", "Discogs")
      8. Take screenshot
    Expected Result: Credit cards render with role-grouped contributors and source badges
    Failure Indicators: No credits section, empty cards, missing source badges
    Evidence: .sisyphus/evidence/task-10-credit-ui.png

  Scenario: Empty state when no credits found
    Tool: Playwright
    Preconditions: Docker running, release without credits loaded
    Steps:
      1. Navigate to release page for a release with no credits
      2. Assert: "No credits found" message is visible
    Expected Result: Empty state message displayed gracefully
    Failure Indicators: Broken layout, error message, empty section with no explanation
    Evidence: .sisyphus/evidence/task-10-empty-state.png
  ```

  **Commit**: YES
  - Message: `feat(ui): credit-focused per-track view`
  - Files: `server/islands/CreditView.tsx`, route modifications
  - Pre-commit: `deno check server/islands/CreditView.tsx`

- [ ] 11. Credit-Focused Web UI — Common Contributors View

  **What to do**:
  - Create a Fresh island component for the "common contributors" view
  - This shows which people contributed to multiple tracks, grouped by role
  - Design follows the original mirmir's sidebar "Common contributors" panel
  - For each role group: list contributors with the tracks they worked on (e.g., "John: Writer on tracks 1-5, 8")
  - Display as a sidebar or collapsible panel alongside the per-track view
  - Include track range compression (tracks 1,2,3,4,5 → "1-5")

  **Must NOT do**:
  - Do NOT replace the per-track view — this is a supplementary view
  - Do NOT implement injection flow (T13)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI component extending the credit display with aggregated contributor view
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on T10's component patterns)
  - **Parallel Group**: Wave 3 (sequential after T10)
  - **Blocks**: None
  - **Blocked By**: T10

  **References**:

  **Pattern References**:
  - `/home/djdembeck/projects/github/mirmir/app/views/sources/show.html.erb:63-87` — Original mirmir "Common contributors" panel with role→person→track range listing
  - `/tmp/harmony/server/islands/` — Fresh island patterns from T10

  **WHY Each Reference Matters**:
  - Original mirmir UI: Proven UX pattern — the common contributors view was specifically useful for seeing who worked on the whole release at a glance
  - Track range compression: Essential for readability (1-5 vs 1,2,3,4,5)

  **Acceptance Criteria**:

  - [ ] Common contributors panel renders alongside per-track view
  - [ ] Contributors grouped by role with track ranges
  - [ ] Track ranges compressed (1-5 not 1,2,3,4,5)
  - [ ] Visual regression test: screenshot matches expected layout

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Common contributors view displays correctly
    Tool: Playwright
    Preconditions: Release loaded with credits from multiple tracks
    Steps:
      1. Navigate to release page with credits
      2. Assert: common contributors panel is visible
      3. Assert: role groups are listed (e.g., "Writer", "Producer")
      4. Assert: track ranges shown (e.g., "1-5" not "1, 2, 3, 4, 5")
      5. Take screenshot
    Expected Result: Common contributors panel with compressed track ranges
    Failure Indicators: Missing panel, uncompressed ranges, wrong grouping
    Evidence: .sisyphus/evidence/task-11-common-contributors.png
  ```

  **Commit**: YES
  - Message: `feat(ui): common contributors view`
  - Files: `server/islands/CommonContributors.tsx`
  - Pre-commit: `deno check server/islands/CommonContributors.tsx`

- [ ] 12. Programmatic MB Relationship Injection via URL Seeding + Form Submission

  **What to do**:
  - Integrate `musicbrainz-api` NPM package via Deno's NPM compatibility (`npm:musicbrainz-api`)
  - Create `mirmir/mb_injector.ts` module that:
    - Authenticates with MusicBrainz using bot account credentials (session-based login via `musicbrainz-api`'s `login()` method, NOT OAuth2)
    - Handles CSRF token extraction automatically (musicbrainz-api handles this internally via `editEntity()`)
    - Creates artist-recording relationships using **`rels.{N}.*` form fields** submitted via `editEntity()` (NOT the REST API which doesn't support relationship creation)
    - Respects MB bot guidelines: rate limiting (1 req/sec, 1000 edits/day max, 2000 open edits max), edit notes, open source requirement
    - Supports a dry-run mode that logs what would be submitted without actually editing
  - **CONFIRMED `rels.{N}.*` form fields** (from `/tmp/mb-server/lib/MusicBrainz/Server/Controller/Role/EditRelationships.pm:90-296`):
    - `rels.{N}.type` — MB relationship type UUID (e.g., `5c0ceac3-feb4-41f0-868d-dc06f6e27fc0` for producer) OR integer ID
    - `rels.{N}.target` — Target artist MBID
    - `rels.{N}.backward` — "1" if the recording is entity1 (not entity0) in the relationship
    - `rels.{N}.source_credit` — Credited name for the source entity (the recording's artist)
    - `rels.{N}.target_credit` — Credited name for the target entity (the credited person, e.g., "Dr. Luke" credited as "Łukasz Gottwald")
    - `rels.{N}.begin_date` / `rels.{N}.end_date` / `rels.{N}.ended` — Date attributes (optional)
    - `rels.{N}.link_order` — Order when multiple relationships of same type
    - `rels.{N}.attributes.{M}.type` — MB attribute type UUID (e.g., `0a5341f8-3b1d-4f99-a0c6-26b7f4e42c7f` for "additional")
    - `rels.{N}.attributes.{M}.credited_as` — Credited name for this attribute
    - `rels.{N}.attributes.{M}.text_value` — Text value for free-text attributes
  - Map `TrackCredit` to `rels.{N}.*` form fields using the confirmed MB relationship type UUIDs and attribute type UUIDs from T3
  - Add edit notes to all submissions: "Imported with mirmir, using data from: [source URLs]"
  - Implement against `test.musicbrainz.org` for development (NOT production MB)
  - **Work-level caveat**: Skip Composer/Lyricist credits for v1 injection (these are work→artist in MB, not recording→artist). Log them as "skipped: work-level relationship".
  - Extend `musicbrainz-api`'s `editEntity()` usage to support `rels.{N}.*` fields (the library only implements `addUrlToRecording` natively — artist-recording relationships need custom form field construction)
  - Write TDD tests using mock responses (do NOT make real edits in tests)

  **Must NOT do**:
  - Do NOT submit edits to production MusicBrainz (`musicbrainz.org`) in development — use `test.musicbrainz.org`
  - Do NOT submit edits without edit notes
  - Do NOT submit edits without dry-run verification first
  - Do NOT implement UI for injection (that's T13)
  - Do NOT use the MB REST API for relationship creation — it does NOT support it
  - Do NOT inject Composer/Lyricist as recording→artist relationships — they are work→artist in MB

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: MB API integration with authentication, CSRF, rate limiting, and community guidelines compliance
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T10, T11, T13 depends on this)
  - **Parallel Group**: Wave 3
  - **Blocks**: T13
  - **Blocked By**: T2 (TrackCredit type), T3 (role mapping table)

  **References**:

  **Pattern References**:
  - `/tmp/harmony/musicbrainz/seeding.ts` — Existing MB seeding code (URL-based) — understand the form field naming convention and `editEntity()` pattern
  - `/tmp/harmony/musicbrainz/mbid_mapping.ts` — MB API interaction patterns

  **MB Server Source References** (CONFIRMED from code inspection):
  - `/tmp/mb-server/lib/MusicBrainz/Server/Controller/Role/EditRelationships.pm:90-296` — **THE authoritative source** for `rels.{N}.*` form field parsing. This is what MB server reads when processing relationship creation via form POST.
  - `/tmp/mb-server/lib/MusicBrainz/Server/Edit/Relationship/Create.pm` — Relationship create edit type — data schema with entity0/entity1, link_type, attributes

  **External References**:
  - `musicbrainz-api` NPM package: https://github.com/Borewit/musicbrainz-api — `editEntity()`, `login()`, `addUrlToRecording()` methods. **Note**: `addUrlToRecording` is the only relationship helper — artist-recording relationships need custom `rels.{N}.*` field construction via `editEntity()`.
  - MB Bot guidelines: https://musicbrainz.org/doc/Code_of_Conduct/Bots — edit limits (1000/day, 2000 open), open source requirement, edit notes
  - MB test server: https://test.musicbrainz.org — for development testing

  **API/Type References**:
  - **CONFIRMED MB relationship type UUIDs** (from T3 mapping table): producer=`5c0ceac3-feb4-41f0-868d-dc06f6e27fc0`, engineer=`5dcc52af-7064-4051-8d62-7d80f4c3c907`, mixer=`3e3102e1-1896-4f50-b5b2-dd9824e46efe`, mastering=`8c9b9e5e-59e9-4d4c-9609-039c8e4f061d`, recording engineer=`6e6e9a6e-1ee4-4b8d-ba4f-e7cc1a4e1c0`
  - **CONFIRMED MB attribute type UUIDs**: additional=`0a5341f8-3b1d-4f99-a0c6-26b7f4e42c7f`, co=`ac6f6b4c-a4ec-4483-a04e-9f425a914573`, guest=`b3045913-62ac-433e-9211-ac683cdf6b5c`, solo=`1c186ed2-8932-424b-8d69-0e8f4f8be8b0`, keyboard=`95b0c3d2-9606-4ef5-a019-9b7437f3adda`, drums=`3bccb7eb-cbca-42cd-b0ac-a5e959df7221`

  **WHY Each Reference Matters**:
  - `EditRelationships.pm`: This is the MB server code that parses the `rels.{N}.*` form fields — understanding this is essential for constructing correct form submissions
  - `musicbrainz-api`: Handles CSRF and session management automatically via `editEntity()` — use it for HTTP plumbing, but construct `rels.{N}.*` fields manually
  - Bot guidelines: Must comply to avoid account ban
  - Test server: Safe place to test without affecting real MB data

  **Acceptance Criteria**:

  - [ ] `mirmir/mb_injector.ts` module created with `login()`, `injectCredits()`, `dryRun()` methods
  - [ ] Authenticates with test.musicbrainz.org using bot account credentials
  - [ ] Creates artist-recording relationships via `rels.{N}.*` form fields submitted through `editEntity()`
  - [ ] Edit notes included in all submissions: "Imported with mirmir, using data from: [source URLs]"
  - [ ] Rate limited to MB guidelines (1 req/sec, 1000 edits/day max)
  - [ ] Dry-run mode logs intended edits with full `rels.{N}.*` field details without submitting
  - [ ] Composer/Lyricist credits skipped with logged warning ("skipped: work-level relationship")
  - [ ] Attribute type UUIDs correctly applied: additional, co, guest, solo, instrument-specific (keyboard, drums)
  - [ ] `deno test mirmir/mb_injector_test.ts` → PASS (using mocks, not real MB)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: MB injector dry-run works with rels fields
    Tool: Bash (deno test)
    Preconditions: MB injector module implemented, mock responses set up
    Steps:
      1. Run `deno test mirmir/mb_injector_test.ts`
      2. Assert dryRun() logs the credits that would be submitted with full rels.{N}.* field details
      3. Assert rels.{N}.type contains correct MB relationship type UUID
      4. Assert rels.{N}.attributes.{M}.type contains correct MB attribute type UUID (e.g., guest=b3045913)
      5. Assert no actual API calls made during dry-run
      6. Assert Composer/Lyricist credits are logged as "skipped: work-level"
    Expected Result: Dry-run mode works without hitting real MB, with correct rels fields
    Failure Indicators: Real API calls in test, missing edit notes, wrong form fields, Composer/Lyricist not skipped
    Evidence: .sisyphus/evidence/task-12-mb-injector.txt

  Scenario: MB injector creates relationship on test server
    Tool: Bash (deno run)
    Preconditions: test.musicbrainz.org account configured, MANUAL TEST ONLY
    Steps:
      1. Run injection script in dry-run mode first
      2. Review dry-run output — verify rels.{N}.* fields are correct
      3. Run injection script against test.musicbrainz.org
      4. Verify relationship appears on test recording page
      5. Verify edit note is present
    Expected Result: Relationship created on test server with proper edit note and attributes
    Failure Indicators: Auth failure, CSRF error, 403 forbidden, relationship not created, attributes missing
    Evidence: .sisyphus/evidence/task-12-mb-test-server.txt
    NOTE: This scenario requires manual trigger — not automated in CI
  ```

  **Commit**: YES
  - Message: `feat(musicbrainz): programmatic relationship injection via rels form fields`
  - Files: `mirmir/mb_injector.ts`, `mirmir/mb_injector_test.ts`, `mirmir/mb_types.ts`
  - Pre-commit: `deno test mirmir/mb_injector_test.ts`

- [ ] 13. MB Injection UI — Credit Selection + Injection Flow

  **What to do**:
  - Create a Fresh island component for the MB injection flow
  - UI flow: user reviews per-track credits → selects which credits to inject → reviews dry-run output → confirms injection
  - Each credit in the per-track view gets a checkbox for selection
  - "Select all" / "Deselect all" buttons per role group
  - "Dry Run" button shows what would be submitted without actually editing
  - "Inject Selected" button submits selected credits to MusicBrainz (via T12's mb_injector module)
  - Show progress: "Injecting 3 of 15 credits..." with a progress indicator
  - Show results: success/failure per credit with MB edit URLs
  - Warn about existing credits: if MB already has a credit for the same role on the same track, highlight it as a potential duplicate
  - Require MB bot account credentials to be configured (env vars or settings page)
  - Include a clear warning: "You are about to edit MusicBrainz. All edits are subject to community review."

  **Must NOT do**:
  - Do NOT auto-inject without user confirmation
  - Do NOT inject to production MB without explicit user choice (default to test server)
  - Do NOT skip the dry-run step

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Interactive UI with selection, confirmation, and progress states
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on T10 for credit display, T12 for injection logic)
  - **Parallel Group**: Wave 3 (sequential after T10 and T12)
  - **Blocks**: None
  - **Blocked By**: T10, T12

  **References**:

  **Pattern References**:
  - `server/islands/CreditView.tsx` (from T10) — Per-track credit display where checkboxes will be added
  - `mirmir/mb_injector.ts` (from T12) — Injection module with `dryRun()` and `injectCredits()` methods
  - `/tmp/harmony/server/islands/` — Fresh island patterns for interactive components

  **WHY Each Reference Matters**:
  - CreditView: Where the selection UI integrates
  - mb_injector: Backend logic the UI calls
  - Islands: Preact component patterns for Fresh

  **Acceptance Criteria**:

  - [ ] Each credit has a checkbox for selection
  - [ ] "Select all" / "Deselect all" per role group
  - [ ] "Dry Run" button shows preview of submissions
  - [ ] "Inject Selected" button with confirmation dialog
  - [ ] Progress indicator during injection
  - [ ] Success/failure results displayed per credit
  - [ ] Warning about MB editing displayed prominently
  - [ ] Potential duplicate detection (existing MB credits highlighted)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Credit selection and dry-run flow
    Tool: Playwright
    Preconditions: Docker running, release with credits loaded, MB bot credentials configured
    Steps:
      1. Navigate to release page with credits
      2. Assert: checkboxes visible on each credit
      3. Click "Select all" for "Producer" role group
      4. Assert: all Producer credits selected
      5. Click "Dry Run" button
      6. Wait for dry-run results (timeout: 15s)
      7. Assert: dry-run output shows credits that would be submitted
      8. Take screenshot
    Expected Result: Dry-run shows preview without actual MB edits
    Failure Indicators: No checkboxes, dry-run button not working, real edits made
    Evidence: .sisyphus/evidence/task-13-selection-dryrun.png

  Scenario: Injection flow with confirmation
    Tool: Playwright
    Preconditions: Same as above, test.musicbrainz.org configured
    Steps:
      1. Select credits for injection
      2. Click "Inject Selected"
      3. Assert: confirmation dialog appears with warning text
      4. Assert: MB editing warning is visible
      5. Click "Confirm" in dialog
      6. Wait for progress indicator
      7. Assert: results displayed (success/failure per credit)
    Expected Result: Injection flow with confirmation, progress, and results
    Failure Indicators: No confirmation dialog, no progress, no results
    Evidence: .sisyphus/evidence/task-13-injection-flow.png
  ```

  **Commit**: YES
  - Message: `feat(ui): MB injection flow with credit selection`
  - Files: `server/islands/CreditSelector.tsx`, `server/islands/InjectionFlow.tsx`
  - Pre-commit: `deno check server/islands/`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `deno check` + `deno lint` + `deno test`. Review all changed files for: `as any`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean Docker state. Execute EVERY QA scenario from EVERY task. Test cross-task integration. Test edge cases: no credits found, rate-limited response, invalid release ID. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **T1**: `spike(tidal): document v2 Credits API for per-track credits`
- **T2**: `feat(harmonizer): extend HarmonyTrack with TrackCredit type system`
- **T3**: `feat(mirmir): add unified Tidal+Discogs→MB role mapping table with confirmed UUIDs`
- **T4**: `chore(test): set up mirmir test infrastructure with Deno`
- **T5**: `chore(docker): add development Docker environment`
- **T6**: `feat(tidal): extract per-track credits via Credits API`
- **T7**: `feat(discogs): extract extraartists per-track credits with role mapping`
- **T8**: `feat(musicbrainz): read existing artist-recording relationships`
- **T9**: `feat(harmonizer): combinable credit merge algorithm`
- **T10**: `feat(ui): credit-focused per-track view`
- **T11**: `feat(ui): common contributors view`
- **T12**: `feat(musicbrainz): programmatic relationship injection via rels form fields`
- **T13**: `feat(ui): MB injection flow with credit selection`

---

## Success Criteria

### Verification Commands
```bash
deno test                                    # Expected: all tests pass
deno check **/*.ts                           # Expected: no type errors
deno lint                                    # Expected: no lint errors
docker build -t mirmir .                     # Expected: builds successfully
docker run --rm -p 3000:3000 mirmir          # Expected: starts, serves on :3000
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Tidal credits extracted and displayed per-track
- [ ] Discogs credits extracted and displayed per-track
- [ ] MB existing credits read and displayed
- [ ] Credits merged from multiple sources with source tracking
- [ ] MB relationship injection works on test.musicbrainz.org
- [ ] Docker deployment works
