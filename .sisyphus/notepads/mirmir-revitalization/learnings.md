# Learnings — mirmir-revitalization

## 2026-05-15 Session Start
- mirmir is currently a Ruby on Rails app (old version)
- Harmony (TypeScript/Deno) is at /tmp/harmony/ — this is the base to fork from
- Deno installed at /home/djdembeck/.deno/bin/deno (v2.7.14)
- Plan: Fork Harmony, extend with per-track credits extraction, credit UI, and MB injection
- Tidal v2 Credits API CONFIRMED working: GET /v2/tracks/{trackId}/relationships/credits?include=credits
- MB relationship creation requires form POST via editEntity(), NOT REST API
- Work-level caveat: Composer/Lyricist are work→artist in MB, NOT recording→artist
