import { assertEquals } from 'std/assert/assert_equals.ts';
import { assertNotEquals } from 'std/assert/assert_not_equals.ts';
import { describe, it } from 'std/testing/bdd.ts';
import type { HarmonyTrack, TrackCredit } from '@/harmonizer/types.ts';
import { combinableTrackProperties } from '@/harmonizer/properties.ts';

describe('TrackCredit', () => {
	it('has required fields: name, role, sources', () => {
		const credit: TrackCredit = {
			name: 'Drake',
			role: 'producer',
			sources: ['Tidal', 'Discogs'],
		};
		assertNotEquals(credit.name, undefined);
		assertNotEquals(credit.role, undefined);
		assertNotEquals(credit.sources, undefined);
		assertEquals(credit.name, 'Drake');
		assertEquals(credit.role, 'producer');
		assertEquals(credit.sources, ['Tidal', 'Discogs']);
	});

	it('has optional fields: creditedName, originalRole, mbid, externalIds', () => {
		const credit: TrackCredit = {
			name: 'Aubrey Graham',
			role: 'producer',
			sources: ['Discogs'],
			creditedName: 'Drake',
			originalRole: 'Co-Producer',
			mbid: '7a3bdb49-7da2-4f2a-a3cc-0e1b3d8a2c4e',
			externalIds: [{ provider: 'discogs', type: 'artist', id: '53468' }],
		};
		assertEquals(credit.creditedName, 'Drake');
		assertEquals(credit.originalRole, 'Co-Producer');
		assertEquals(credit.mbid, '7a3bdb49-7da2-4f2a-a3cc-0e1b3d8a2c4e');
		assertEquals(credit.externalIds, [{ provider: 'discogs', type: 'artist', id: '53468' }]);
	});

	it('allows optional fields to be omitted', () => {
		const credit: TrackCredit = {
			name: 'Noah "40" Shebib',
			role: 'mixer',
			sources: ['Tidal'],
		};
		assertEquals(credit.creditedName, undefined);
		assertEquals(credit.originalRole, undefined);
		assertEquals(credit.mbid, undefined);
		assertEquals(credit.externalIds, undefined);
	});
});

describe('HarmonyTrack credits', () => {
	it('can have a credits field with TrackCredit[] values', () => {
		const track: HarmonyTrack = {
			title: 'God\'s Plan',
			credits: [
				{ name: 'Drake', role: 'performer', sources: ['Tidal'] },
				{ name: 'Noah "40" Shebib', role: 'producer', sources: ['Tidal', 'Discogs'] },
			],
		};
		assertNotEquals(track.credits, undefined);
		assertEquals(track.credits!.length, 2);
		assertEquals(track.credits![0].name, 'Drake');
		assertEquals(track.credits![1].role, 'producer');
	});

	it('allows credits to be omitted', () => {
		const track: HarmonyTrack = {
			title: 'Instrumental Track',
		};
		assertEquals(track.credits, undefined);
	});
});

describe('combinableTrackProperties', () => {
	it('includes credits as a combinable track property', () => {
		assertEquals(combinableTrackProperties.includes('credits' as typeof combinableTrackProperties[number]), true);
	});
});
