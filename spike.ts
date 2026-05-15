#!/usr/bin/env -S deno run --allow-net --allow-env

/**
 * Tidal v2 Credits API Spike Script
 * 
 * Minimal repro script to authenticate with Tidal v2 API
 * and fetch credits for a test track.
 * 
 * Usage:
 *   export PATH="$HOME/.deno/bin:$PATH"
 *   deno run --allow-net --allow-env spike.ts
 */

// Tidal v2 API configuration
const TIDAL_AUTH_URL = 'https://auth.tidal.com/v1/oauth2/token';
const TIDAL_API_BASE = 'https://openapi.tidal.com/v2';

// Fallback credentials (Tiddl client credentials that work with v2 Open API)
const FALLBACK_CLIENT_ID = '4N3n6Q1x95LL5K7p';
const FALLBACK_CLIENT_SECRET = 'oKOXfJW371cX6xaZ0PyhgGNBdNLlBZd4AKKYougMjik=';

// Test track ID
const TEST_TRACK_ID = '329293927';

interface TidalTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface CreditData {
  id: string;
  type: string;
}

interface CreditAttributes {
  name: string;
  role: string;
}

interface CreditIncluded {
  id: string;
  type: string;
  attributes: CreditAttributes;
}

interface CreditsResponse {
  data: CreditData[];
  included: CreditIncluded[];
}

/**
 * Authenticate with Tidal v2 API using client credentials flow.
 */
async function authenticate(): Promise<string> {
  const clientId = Deno.env.get('HARMONY_TIDAL_CLIENT_ID') || FALLBACK_CLIENT_ID;
  const clientSecret = Deno.env.get('HARMONY_TIDAL_CLIENT_SECRET') || FALLBACK_CLIENT_SECRET;

  console.log('🔐 Authenticating with Tidal v2 API...');

  const response = await fetch(TIDAL_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Authentication failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data: TidalTokenResponse = await response.json();

  console.log(`✅ Authentication successful`);
  console.log(`   Token type: ${data.token_type}`);
  console.log(`   Expires in: ${data.expires_in} seconds`);

  return data.access_token;
}

/**
 * Fetch credits for a specific track.
 */
async function fetchCredits(accessToken: string, trackId: string): Promise<CreditsResponse> {
  const url = `${TIDAL_API_BASE}/tracks/${trackId}/relationships/credits?include=credits`;

  console.log(`\n📡 Fetching credits for track ${trackId}...`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch credits: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data: CreditsResponse = await response.json();

  console.log(`✅ Credits fetched successfully`);
  console.log(`   Found ${data.data.length} credit(s)`);

  return data;
}

/**
 * Display credits in a readable format.
 */
function displayCredits(response: CreditsResponse): void {
  console.log('\n📋 Track Credits:');
  console.log('─'.repeat(50));

  if (response.included.length === 0) {
    console.log('   No credits found');
    return;
  }

  for (const credit of response.included) {
    console.log(`   • ${credit.attributes.name}`);
    console.log(`     Role: ${credit.attributes.role}`);
  }

  console.log('─'.repeat(50));
}

/**
 * Main execution.
 */
async function main(): Promise<void> {
  console.log('🎵 Tidal v2 Credits API Spike Script');
  console.log('='.repeat(50));

  try {
    // Step 1: Authenticate
    const accessToken = await authenticate();

    // Step 2: Fetch credits
    const creditsResponse = await fetchCredits(accessToken, TEST_TRACK_ID);

    // Step 3: Display results
    displayCredits(creditsResponse);

    console.log('\n✅ Spike script completed successfully!');
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    Deno.exit(1);
  }
}

// Run the script
await main();
