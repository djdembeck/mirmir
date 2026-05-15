import {
  createMockDiscogsReleaseWithCredits,
  createMockMBRecordingWithRels,
  createMockTidalCreditsResponse,
  createMockTrackCredit,
  loadFixture,
  type TrackCredit,
} from './helpers.ts';

import { describe, it } from '@std/testing/bdd';
import { assertEquals } from 'std/assert/assert_equals.ts';
import { assertExists } from 'std/assert/assert_exists.ts';

describe('test helpers', () => {
  describe('loadFixture', () => {
    it('parses Tidal fixture correctly', () => {
      const fixture = loadFixture('tidal-credits-response.json');
      assertExists(fixture);
      assertEquals(typeof fixture, 'object');
      const tidalFixture = fixture as Record<string, unknown>;
      assertEquals(Array.isArray(tidalFixture.data), true);
      assertEquals(Array.isArray(tidalFixture.included), true);
      assertEquals((tidalFixture.data as Array<unknown>).length, 10);
      assertEquals((tidalFixture.included as Array<unknown>).length, 10);
    });

    it('parses Discogs fixture correctly', () => {
      const fixture = loadFixture('discogs-extraartists-response.json');
      assertExists(fixture);
      assertEquals(typeof fixture, 'object');
      const discogsFixture = fixture as Record<string, unknown>;
      assertEquals(discogsFixture.title, 'For All The Dogs');
      assertEquals(Array.isArray(discogsFixture.extraartists), true);
      assertEquals(Array.isArray(discogsFixture.tracklist), true);
    });

    it('parses MB fixture correctly', () => {
      const fixture = loadFixture('mb-artist-recording-rels.json');
      assertExists(fixture);
      assertEquals(typeof fixture, 'object');
      const mbFixture = fixture as Record<string, unknown>;
      assertEquals(mbFixture.title, 'Virginia Beach');
      assertEquals(typeof mbFixture.length, 'number');
      assertEquals(Array.isArray(mbFixture.relations), true);
    });
  });

  describe('createMockTrackCredit', () => {
    it('creates valid TrackCredit with defaults', () => {
      const credit = createMockTrackCredit();
      assertEquals(credit.name, 'Test Artist');
      assertEquals(credit.role, 'Producer');
      assertEquals(credit.sources, [{ provider: 'tidal', id: 'test-id' }]);
    });

    it('applies overrides', () => {
      const credit = createMockTrackCredit({
        name: 'Drake',
        role: 'Lyricist',
        creditedName: 'Aubrey Graham',
        mbid: '12345678-1234-1234-1234-123456789012',
      });
      assertEquals(credit.name, 'Drake');
      assertEquals(credit.role, 'Lyricist');
      assertEquals(credit.creditedName, 'Aubrey Graham');
      assertEquals(credit.mbid, '12345678-1234-1234-1234-123456789012');
      assertEquals(credit.sources, [{ provider: 'tidal', id: 'test-id' }]);
    });
  });

  describe('typed fixture loaders', () => {
    it('createMockTidalCreditsResponse returns typed fixture', () => {
      const response = createMockTidalCreditsResponse();
      assertEquals(response.data.length, 10);
      assertEquals(response.included.length, 10);
      assertEquals(response.included[0].attributes.name, 'Drake');
      assertEquals(response.included[0].attributes.role, 'Lyricist');
    });

    it('createMockDiscogsReleaseWithCredits returns typed fixture', () => {
      const release = createMockDiscogsReleaseWithCredits();
      assertEquals(release.title, 'For All The Dogs');
      assertExists(release.extraartists);
      assertEquals(release.extraartists.length, 7);
      assertExists(release.tracklist);
      assertEquals(release.tracklist.length, 3);
    });

    it('createMockMBRecordingWithRels returns typed fixture', () => {
      const recording = createMockMBRecordingWithRels();
      assertEquals(recording.title, 'Virginia Beach');
      assertEquals(recording.length, 182000);
      assertExists(recording.relations);
      assertEquals(recording.relations.length, 5);
      const producerRel = recording.relations.find((r) => r.type === 'producer');
      assertExists(producerRel);
      assertEquals(producerRel!.artist.name, 'Noah "40" Shebib');
    });
  });
});
