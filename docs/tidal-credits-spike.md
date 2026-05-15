# Tidal v2 Credits API Spike

**Date:** 2026-05-15  
**Purpose:** Document the working Tidal v2 Credits API endpoint for per-track credits extraction

## Working Endpoint

```
GET /v2/tracks/{trackId}/relationships/credits?include=credits
```

**Base URL:** `https://openapi.tidal.com/v2/`

**Full Example:**
```
GET https://openapi.tidal.com/v2/tracks/329293927/relationships/credits?include=credits
```

## Authentication

### OAuth 2.0 Client Credentials Flow

**Token Endpoint:**
```
POST https://auth.tidal.com/v1/oauth2/token
```

**Request Body (application/x-www-form-urlencoded):**
```
grant_type=client_credentials
client_id=4N3n6Q1x95LL5K7p
client_secret=oKOXfJW371cX6xaZ0PyhgGNBdNLlBZd4AKKYougMjik=
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 14400,
  "scope": ""
}
```

**Token Validity:** 14400 seconds (4 hours)

**Authorization Header:**
```
Authorization: Bearer {access_token}
```

## Response Structure

### Success Response (200 OK)

```json
{
  "data": [
    {
      "id": "credit-1",
      "type": "credits"
    },
    {
      "id": "credit-2",
      "type": "credits"
    }
  ],
  "included": [
    {
      "id": "credit-1",
      "type": "credits",
      "attributes": {
        "name": "Artist Name",
        "role": "Producer"
      }
    },
    {
      "id": "credit-2",
      "type": "credits",
      "attributes": {
        "name": "Another Artist",
        "role": "Composer"
      }
    }
  ]
}
```

### Key Observations

1. **`data` array:** Contains references to credits (id + type only)
2. **`included` array:** Contains the actual credit details with `attributes.name` and `attributes.role`
3. **Role strings are free-form:** NOT limited to the 7-role ArtistRoles enum

## Free-Form Role Strings Observed

The following roles have been observed in actual API responses:

- `Co-Producer`
- `Composer`
- `Drum Kit`
- `Keyboard`
- `Lyricist`
- `Mastering Engineer`
- `Producer`
- `AdditionalProducer`
- `Featured Artist`
- `Mixing`
- `Mixing Engineer`
- `Recording Engineer`

**KEY INSIGHT:** The Credits API is the **primary source** for per-track credits, NOT the 7-role ArtistRoles enum. The enum is a secondary classification.

## Test Album IDs

**Album:** `329293912`

**Track IDs:**
- `329293927` - Track 1
- `329293934` - Track 2
- `329293940` - Track 3
- `329293948` - Track 4

## Limitations

1. **Single credit GET returns 404:**
   ```
   GET /v2/tracks/{trackId}/credits/{creditId} → 404 Not Found
   ```
   You must use the relationships endpoint with `include=credits`.

2. **Client credentials scope limitations:**
   - `include=artist,category` doesn't add extra data with client credentials
   - Only basic credit name and role are returned

3. **Token expiration:**
   - Tokens expire after 4 hours (14400 seconds)
   - Implement token refresh logic for long-running processes

## Usage Example (Deno/TypeScript)

```typescript
// 1. Authenticate
const tokenResponse = await fetch('https://auth.tidal.com/v1/oauth2/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: Deno.env.get('HARMONY_TIDAL_CLIENT_ID')!,
    client_secret: Deno.env.get('HARMONY_TIDAL_CLIENT_SECRET')!,
  }),
});
const { access_token } = await tokenResponse.json();

// 2. Fetch credits
const creditsResponse = await fetch(
  'https://openapi.tidal.com/v2/tracks/329293927/relationships/credits?include=credits',
  {
    headers: { 'Authorization': `Bearer ${access_token}` },
  }
);
const { data, included } = await creditsResponse.json();

// 3. Extract credits
const credits = included.map((credit: any) => ({
  name: credit.attributes.name,
  role: credit.attributes.role,
}));
```

## References

- Tidal v2 Open API Documentation: https://developer.tidal.com/
- OAuth 2.0 Client Credentials: https://developer.tidal.com/documentation/oauth
- Related: `/providers/Tidal/v2/lookup.ts` in Harmony codebase
