# Decisions — mirmir-revitalization

## 2026-05-15 Session Start
- Stack: Deno + Fresh + Preact (staying on Harmony's stack)
- Database: Defer PostgreSQL to v1.5, use Harmony's snap_storage
- Tidal Credits API is primary source (NOT ArtistRoles 7-role enum)
- MB injection via rels.{N}.* form fields through musicbrainz-api's editEntity()
- v1 skips Composer/Lyricist for recording-level injection (work-level in MB)
