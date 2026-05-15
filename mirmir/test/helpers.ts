/**
 * Test helpers for mirmir test infrastructure.
 * Provides fixture loading and mock provider creation utilities.
 */

import { fromFileUrl } from '@std/path';

/**
 * Local TrackCredit interface for testing.
 * Matches the expected shape from T2 (TrackCredit type).
 */
export interface TrackCredit {
  name: string;
  role: string;
  sources: Array<{ provider: string; id?: string }>;
  creditedName?: string;
  originalRole?: string;
  mbid?: string;
  externalIds?: Array<{ type: string; id: string; provider: string }>;
}

/**
 * Tidal Credits API response structure.
 */
export interface TidalCreditsResponse {
  data: Array<{ id: string; type: string }>;
  included: Array<{
    id: string;
    type: string;
    attributes: {
      name: string;
      role: string;
    };
  }>;
}

/**
 * Discogs release with extraartists structure.
 */
export interface DiscogsRelease {
  id: string;
  title: string;
  artists: Array<{ id: string; name: string; join?: string }>;
  extraartists?: Array<{
    id: string;
    name: string;
    role: string;
    tracks?: string;
    anv?: string;
  }>;
  tracklist?: Array<{
    position: string;
    title: string;
    duration?: string;
    extraartists?: Array<{
      id: string;
      name: string;
      role: string;
      anv?: string;
    }>;
  }>;
  genres?: string[];
  styles?: string[];
  year?: string;
  labels?: Array<{ id: string; name: string; catno?: string }>;
}

/**
 * MusicBrainz recording with artist relationships structure.
 */
export interface MBRecordingResponse {
  id: string;
  title: string;
  length?: number;
  'artist-credit'?: Array<{
    artist: {
      id: string;
      name: string;
      'sort-name'?: string;
      disambiguation?: string;
    };
    name: string;
    joinphrase?: string;
  }>;
  relations?: Array<{
    type: string;
    direction?: string;
    artist: {
      id: string;
      name: string;
      'sort-name'?: string;
      disambiguation?: string;
    };
    attributes?: string[];
    'attribute-ids'?: Record<string, string>;
  }>;
}

/**
 * Base path to fixtures directory.
 */
const FIXTURES_DIR = new URL('./fixtures/', import.meta.url);

/**
 * Loads and parses a JSON fixture file from mirmir/test/fixtures/.
 * @param name - The fixture filename (e.g., 'tidal-credits-response.json')
 * @returns Parsed JSON content as unknown
 */
export function loadFixture(name: string): unknown {
  const fixturePath = fromFileUrl(new URL(name, FIXTURES_DIR));
  const content = Deno.readTextFileSync(fixturePath);
  return JSON.parse(content);
}

/**
 * Loads and returns a typed Tidal credits response fixture.
 * @returns TidalCreditsResponse
 */
export function createMockTidalCreditsResponse(): TidalCreditsResponse {
  return loadFixture('tidal-credits-response.json') as TidalCreditsResponse;
}

/**
 * Loads and returns a typed Discogs release with credits fixture.
 * @returns DiscogsRelease
 */
export function createMockDiscogsReleaseWithCredits(): DiscogsRelease {
  return loadFixture('discogs-extraartists-response.json') as DiscogsRelease;
}

/**
 * Loads and returns a typed MusicBrainz recording with artist relationships fixture.
 * @returns MBRecordingResponse
 */
export function createMockMBRecordingWithRels(): MBRecordingResponse {
  return loadFixture('mb-artist-recording-rels.json') as MBRecordingResponse;
}

/**
 * Creates a mock TrackCredit object for testing.
 * @param overrides - Optional partial overrides for customizing the credit
 * @returns TrackCredit object
 */
export function createMockTrackCredit(
  overrides?: Partial<TrackCredit>,
): TrackCredit {
  return {
    name: 'Test Artist',
    role: 'Producer',
    sources: [{ provider: 'tidal', id: 'test-id' }],
    ...overrides,
  };
}
