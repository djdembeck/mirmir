import { assertEquals } from 'std/assert/assert_equals.ts';
import { assertNotEquals } from 'std/assert/assert_not_equals.ts';
import { describe, it, beforeEach } from '@std/testing/bdd';
import {
	normalizeRole,
	buildRecordingUrl,
	relationToTrackCredit,
	recordingResponseToCredits,
	fetchRecordingCredits,
	fetchReleaseCredits,
	resetRateLimiter,
	type MBArtistRelation,
	type MBRecordingResponse,
} from './mb_credits.ts';
import { createMockMBRecordingWithRels } from './test/helpers.ts';

describe('normalizeRole', () => {
	it('maps "producer" to "producer"', () => {
		assertEquals(normalizeRole('producer'), 'producer');
	});

	it('maps "engineer" to "engineer"', () => {
		assertEquals(normalizeRole('engineer'), 'engineer');
	});

	it('maps "mix" to "mixer"', () => {
		assertEquals(normalizeRole('mix'), 'mixer');
	});

	it('maps "mixer" to "mixer"', () => {
		assertEquals(normalizeRole('mixer'), 'mixer');
	});

	it('maps "mastering" to "mastering"', () => {
		assertEquals(normalizeRole('mastering'), 'mastering');
	});

	it('maps "recording" to "recording"', () => {
		assertEquals(normalizeRole('recording'), 'recording');
	});

	it('maps "performer" to "performer"', () => {
		assertEquals(normalizeRole('performer'), 'performer');
	});

	it('maps "instruments" to "instruments"', () => {
		assertEquals(normalizeRole('instruments'), 'instruments');
	});

	it('maps "vocal" to "vocalist"', () => {
		assertEquals(normalizeRole('vocal'), 'vocalist');
	});

	it('maps "vocals" to "vocalist"', () => {
		assertEquals(normalizeRole('vocals'), 'vocalist');
	});

	it('preserves unknown relationship types as-is', () => {
		assertEquals(normalizeRole('some-future-type'), 'some-future-type');
	});
});

describe('buildRecordingUrl', () => {
	it('constructs correct MB API URL for a recording', () => {
		const mbid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
		const url = buildRecordingUrl(mbid);
		assertEquals(
			url,
			'https://musicbrainz.org/ws/2/recording/a1b2c3d4-e5f6-7890-abcd-ef1234567890?inc=artist-rels&fmt=json',
		);
	});
});

describe('relationToTrackCredit', () => {
	it('converts a producer relationship to TrackCredit', () => {
		const relation: MBArtistRelation = {
			type: 'producer',
			direction: 'backward',
			artist: {
				id: '23456789-2345-2345-2345-234567890123',
				name: 'Noah "40" Shebib',
				'sort-name': 'Shebib, Noah',
				disambiguation: 'Canadian producer',
			},
			attributes: [],
			'attribute-ids': {},
		};

		const credit = relationToTrackCredit(relation);
		assertEquals(credit.name, 'Noah "40" Shebib');
		assertEquals(credit.role, 'producer');
		assertEquals(credit.sources, ['MusicBrainz']);
		assertEquals(credit.mbid, '23456789-2345-2345-2345-234567890123');
		assertEquals(credit.externalIds, [{
			provider: 'musicbrainz',
			type: 'artist',
			id: '23456789-2345-2345-2345-234567890123',
		}]);
	});

	it('normalizes "mix" type to "mixer" role', () => {
		const relation: MBArtistRelation = {
			type: 'mix',
			artist: {
				id: '45678901-4567-4567-4567-456789012345',
				name: 'Mix Engineer',
			},
		};

		const credit = relationToTrackCredit(relation);
		assertEquals(credit.role, 'mixer');
	});

	it('normalizes "vocal" type to "vocalist" role', () => {
		const relation: MBArtistRelation = {
			type: 'vocal',
			artist: {
				id: '99999999-9999-9999-9999-999999999999',
				name: 'Singer',
			},
		};

		const credit = relationToTrackCredit(relation);
		assertEquals(credit.role, 'vocalist');
	});

	it('preserves unknown relationship type as role', () => {
		const relation: MBArtistRelation = {
			type: 'some-future-rel-type',
			artist: {
				id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
				name: 'Future Artist',
			},
		};

		const credit = relationToTrackCredit(relation);
		assertEquals(credit.role, 'some-future-rel-type');
	});
});

describe('recordingResponseToCredits', () => {
	it('converts fixture MB recording response to TrackCredit[]', () => {
		const response = createMockMBRecordingWithRels();
		const credits = recordingResponseToCredits(response as MBRecordingResponse);

		assertEquals(credits.length, 5);

		assertEquals(credits[0].name, 'Noah "40" Shebib');
		assertEquals(credits[0].role, 'producer');
		assertEquals(credits[0].sources, ['MusicBrainz']);
		assertEquals(credits[0].mbid, '23456789-2345-2345-2345-234567890123');

		assertEquals(credits[1].name, 'Vinylz');
		assertEquals(credits[1].role, 'producer');

		assertEquals(credits[2].name, 'Noel Cadastre');
		assertEquals(credits[2].role, 'engineer');

		assertEquals(credits[3].name, 'Noel Cadastre');
		assertEquals(credits[3].role, 'mixer');

		assertEquals(credits[4].name, 'Chris Athens');
		assertEquals(credits[4].role, 'engineer');
	});

	it('returns empty array for response with no relations', () => {
		const response: MBRecordingResponse = {
			id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
			title: 'Empty Recording',
		};

		const credits = recordingResponseToCredits(response);
		assertEquals(credits, []);
	});

	it('returns empty array for response with empty relations array', () => {
		const response: MBRecordingResponse = {
			id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
			title: 'No Credits Recording',
			relations: [],
		};

		const credits = recordingResponseToCredits(response);
		assertEquals(credits, []);
	});

	it('populates mbid on each credit', () => {
		const response = createMockMBRecordingWithRels();
		const credits = recordingResponseToCredits(response as MBRecordingResponse);

		for (const credit of credits) {
			assertNotEquals(credit.mbid, undefined);
			assertEquals(credit.mbid!.length, 36);
		}
	});

	it('sets sources to ["MusicBrainz"] on each credit', () => {
		const response = createMockMBRecordingWithRels();
		const credits = recordingResponseToCredits(response as MBRecordingResponse);

		for (const credit of credits) {
			assertEquals(credit.sources, ['MusicBrainz']);
		}
	});

	it('populates externalIds with musicbrainz provider on each credit', () => {
		const response = createMockMBRecordingWithRels();
		const credits = recordingResponseToCredits(response as MBRecordingResponse);

		for (const credit of credits) {
			assertEquals(credit.externalIds?.length, 1);
			assertEquals(credit.externalIds![0].provider, 'musicbrainz');
			assertEquals(credit.externalIds![0].type, 'artist');
			assertEquals(credit.externalIds![0].id, credit.mbid);
		}
	});
});

describe('rate limiting', () => {
	beforeEach(() => {
		resetRateLimiter();
	});

	it('enforces minimum 1 second between requests', async () => {
		// Mock fetch to avoid network calls
		const originalFetch = globalThis.fetch;
		globalThis.fetch = async () =>
			new Response(JSON.stringify({}), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});

		try {
			const { rateLimitedFetch } = await import('./mb_credits.ts');

			const start = Date.now();
			await rateLimitedFetch('https://musicbrainz.org/test1');
			await rateLimitedFetch('https://musicbrainz.org/test2');
			const end = Date.now();

			const totalElapsed = end - start;
			assertEquals(
				totalElapsed >= 1000,
				true,
				`Two rate-limited requests should take >=1s, took ${totalElapsed}ms`,
			);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});

describe('fetchRecordingCredits with mock', () => {
	beforeEach(() => {
		resetRateLimiter();
	});

	it('returns empty array for non-existent recording', async () => {
		// Mock fetch to return 404 for non-existent recording
		const originalFetch = globalThis.fetch;
		globalThis.fetch = async () =>
			new Response(null, {
				status: 404,
				statusText: 'Not Found',
			});

		try {
			const credits = await fetchRecordingCredits(
				'ffffffff-ffff-ffff-ffff-ffffffffffff',
			);

			assertEquals(credits, []);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});

describe('fetchReleaseCredits', () => {
	beforeEach(() => {
		resetRateLimiter();
	});

	it('returns a Map from recording MBID to TrackCredit[]', async () => {
		const credits = await fetchReleaseCredits([]);
		assertEquals(credits instanceof Map, true);
		assertEquals(credits.size, 0);
	});
});
