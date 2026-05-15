# Issues — mirmir-revitalization

(No issues yet)

## Fabricated UUIDs in role_mapping.ts (FIXED)

- Previous subagent fabricated ~23 fake UUIDs in `MB_RELATIONSHIP_TYPES` and `MB_ATTRIBUTE_TYPES`
- Some had invalid UUID format (e.g. `4g66`, `5h77`, `6i88` — hex digits don't go past `f`)
- `orchestrator` and `editor` shared the same fake UUID `5b6e4e3d-3c2b-4a1f-9e0d-8c7b6a5f4e3d`
- `programmer` reused the `recording` relationship type UUID — wrong relationship type
- `recording` UUID in task spec was 35 chars (missing one hex digit): `6e6e9a6e-1ee4-4b8d-ba4f-e7cc1a4e1c0` — corrected to plan line 378's 36-char version: `6e6e9a6e-1ee4-4b8d-ba4f-e7cc1a8473e5`
- Fix: replaced all fabricated UUIDs with `''` + `// UNCONFIRMED - needs lookup from MB server SQL` comment
- Added UUID correctness test suite with 4 tests validating confirmed vs unconfirmed UUIDs
