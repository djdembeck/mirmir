import { assertEquals, assertNotEquals } from 'std/assert/mod.ts';
import { describe, it } from '@std/testing/bdd';
import { parseTrackRange, convertExtraartistToCredits, extractTrackLevelCredits, buildReleaseLevelCreditMap } from './credits.ts';
import type { Artist, Track } from './api_types.ts';

describe('parseTrackRange', () => {
	const positions = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

	it('parses comma-separated single values', () => {
		assertEquals(parseTrackRange('1, 3, 5', positions), [0, 2, 4]);
	});

	it('parses numeric ranges', () => {
		assertEquals(parseTrackRange('3-5', positions), [2, 3, 4]);
	});

	it('parses mixed single values and ranges', () => {
		assertEquals(parseTrackRange('1, 3-5, 7', positions), [0, 2, 3, 4, 6]);
	});

	it('parses full range "1-10"', () => {
		assertEquals(parseTrackRange('1-10', positions), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
	});

	it('parses single value', () => {
		assertEquals(parseTrackRange('2', positions), [1]);
	});

	it('returns empty for non-matching positions', () => {
		assertEquals(parseTrackRange('99', positions), []);
	});

	it('parses vinyl positions with range', () => {
		const vinylPositions = ['A1', 'A2', 'A3', 'B1', 'B2'];
		assertEquals(parseTrackRange('A1-A3', vinylPositions), [0, 1, 2]);
	});

	it('parses mixed vinyl and numeric positions', () => {
		const vinylPositions = ['A1', 'A2', 'A3', 'B1', 'B2'];
		assertEquals(parseTrackRange('A1, B1-B2', vinylPositions), [0, 3, 4]);
	});
});

describe('convertExtraartistToCredits', () => {
	it('maps "Produced By" to producer role', () => {
		const artist: Artist = { id: 234567, name: 'Noah "40" Shebib', anv: '', join: '', role: 'Produced By', tracks: '', resource_url: '' };
		const credits = convertExtraartistToCredits(artist);
		assertEquals(credits.length, 1);
		assertEquals(credits[0].role, 'producer');
		assertEquals(credits[0].originalRole, 'Produced By');
		assertEquals(credits[0].name, 'Noah "40" Shebib');
	});

	it('preserves creditedName from ANV', () => {
		const artist: Artist = { id: 890123, name: 'Lil Yachty', anv: 'Yachty', join: '', role: 'Vocals [Backing]', tracks: '7', resource_url: '' };
		const credits = convertExtraartistToCredits(artist);
		assertEquals(credits[0].creditedName, 'Yachty');
	});

	it('sets creditedName to undefined when ANV is empty', () => {
		const artist: Artist = { id: 234567, name: 'Noah "40" Shebib', anv: '', join: '', role: 'Produced By', tracks: '', resource_url: '' };
		const credits = convertExtraartistToCredits(artist);
		assertEquals(credits[0].creditedName, undefined);
	});

	it('splits compound roles into separate credits', () => {
		const artist: Artist = { id: 111, name: 'Some Artist', anv: '', join: '', role: 'Produced By, Mixed By', tracks: '', resource_url: '' };
		const credits = convertExtraartistToCredits(artist);
		assertEquals(credits.length, 2);
		assertEquals(credits[0].role, 'producer');
		assertEquals(credits[0].originalRole, 'Produced By');
		assertEquals(credits[1].role, 'mixer');
		assertEquals(credits[1].originalRole, 'Mixed By');
	});

	it('maps bracket notation roles', () => {
		const artist: Artist = { id: 789012, name: 'Jahaan Sweet', anv: '', join: '', role: 'Guitar [Electric]', tracks: '4', resource_url: '' };
		const credits = convertExtraartistToCredits(artist);
		assertEquals(credits[0].role, 'performer');
		assertEquals(credits[0].originalRole, 'Guitar [Electric]');
	});

	it('populates externalIds with discogs provider', () => {
		const artist: Artist = { id: 234567, name: 'Test', anv: '', join: '', role: 'Produced By', tracks: '', resource_url: '' };
		const credits = convertExtraartistToCredits(artist);
		assertEquals(credits[0].externalIds, [{ provider: 'discogs', type: 'artist', id: '234567' }]);
	});

	it('returns empty array for empty role', () => {
		const artist: Artist = { id: 1, name: 'Test', anv: '', join: '', role: '', tracks: '', resource_url: '' };
		assertEquals(convertExtraartistToCredits(artist), []);
	});
});

describe('extractTrackLevelCredits', () => {
	it('extracts credits from track extraartists', () => {
		const track: Track = {
			position: '1',
			type_: 'track',
			title: 'Virginia Beach',
			duration: '3:02',
			extraartists: [
				{ id: 234567, name: 'Noah "40" Shebib', anv: '', join: '', role: 'Produced By', tracks: '', resource_url: '' },
				{ id: 567890, name: 'Chris Athens', anv: '', join: '', role: 'Mastered By', tracks: '', resource_url: '' },
			],
		};
		const credits = extractTrackLevelCredits(track);
		assertEquals(credits.length, 2);
		assertEquals(credits[0].role, 'producer');
		assertEquals(credits[1].role, 'mastering');
	});

	it('returns empty for track without extraartists', () => {
		const track: Track = { position: '1', type_: 'track', title: 'Test', duration: '' };
		assertEquals(extractTrackLevelCredits(track), []);
	});

	it('extracts creditedName from track-level ANV', () => {
		const track: Track = {
			position: '3',
			type_: 'track',
			title: 'Calling For You',
			duration: '3:15',
			extraartists: [
				{ id: 234567, name: 'Noah "40" Shebib', anv: '40', join: '', role: 'Produced By', tracks: '', resource_url: '' },
			],
		};
		const credits = extractTrackLevelCredits(track);
		assertEquals(credits[0].creditedName, '40');
	});
});

describe('buildReleaseLevelCreditMap', () => {
	it('distributes credits by track range "1, 3-5, 7"', () => {
		const positions = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
		const extraartists: Artist[] = [{
			id: 234567,
			name: 'Noah "40" Shebib',
			anv: '',
			join: '',
			role: 'Produced By',
			tracks: '1, 3-5, 7',
			resource_url: '',
		}];
		const creditMap = buildReleaseLevelCreditMap(extraartists, positions);
		assertEquals(creditMap.get('1')?.length, 1);
		assertEquals(creditMap.get('2'), undefined);
		assertEquals(creditMap.get('3')?.length, 1);
		assertEquals(creditMap.get('4')?.length, 1);
		assertEquals(creditMap.get('5')?.length, 1);
		assertEquals(creditMap.get('6'), undefined);
		assertEquals(creditMap.get('7')?.length, 1);
	});

	it('distributes credits to all tracks when tracks field is empty', () => {
		const positions = ['1', '2', '3'];
		const extraartists: Artist[] = [{
			id: 567890,
			name: 'Chris Athens',
			anv: '',
			join: '',
			role: 'Mastered By',
			tracks: '',
			resource_url: '',
		}];
		const creditMap = buildReleaseLevelCreditMap(extraartists, positions);
		assertEquals(creditMap.get('1')?.length, 1);
		assertEquals(creditMap.get('2')?.length, 1);
		assertEquals(creditMap.get('3')?.length, 1);
	});

	it('handles multiple extraartists with overlapping track ranges', () => {
		const positions = ['1', '2', '3', '4', '5'];
		const extraartists: Artist[] = [
			{ id: 1, name: 'Producer A', anv: '', join: '', role: 'Produced By', tracks: '1-3', resource_url: '' },
			{ id: 2, name: 'Producer B', anv: '', join: '', role: 'Produced By', tracks: '3-5', resource_url: '' },
		];
		const creditMap = buildReleaseLevelCreditMap(extraartists, positions);
		assertEquals(creditMap.get('1')?.length, 1);
		assertEquals(creditMap.get('3')?.length, 2);
		assertEquals(creditMap.get('5')?.length, 1);
	});

	it('returns empty map for undefined extraartists', () => {
		const creditMap = buildReleaseLevelCreditMap(undefined, ['1', '2']);
		assertEquals(creditMap.size, 0);
	});

	it('skips extraartists with empty role', () => {
		const positions = ['1', '2'];
		const extraartists: Artist[] = [
			{ id: 1, name: 'No Role', anv: '', join: '', role: '', tracks: '1', resource_url: '' },
		];
		const creditMap = buildReleaseLevelCreditMap(extraartists, positions);
		assertEquals(creditMap.size, 0);
	});
});

describe('Discogs credits integration with fixture', () => {
	it('extracts track-level credits from fixture data', async () => {
		const fixture = await Deno.readTextFile('mirmir/test/fixtures/discogs-extraartists-response.json');
		const data = JSON.parse(fixture);

		const track1 = data.tracklist[0];
		const credits = extractTrackLevelCredits(track1);
		assertEquals(credits.length, 3);
		const roles = credits.map((c: { role: string }) => c.role);
		assertNotEquals(roles.indexOf('producer'), -1);
		assertNotEquals(roles.indexOf('mastering'), -1);
		assertNotEquals(roles.indexOf('mixer'), -1);
	});

	it('extracts release-level credits with track ranges from fixture', async () => {
		const fixture = await Deno.readTextFile('mirmir/test/fixtures/discogs-extraartists-response.json');
		const data = JSON.parse(fixture);

		const positions = data.tracklist.map((t: { position: string }) => t.position);
		const creditMap = buildReleaseLevelCreditMap(data.extraartists, positions);

		const track1Credits = creditMap.get('1') ?? [];
		assertNotEquals(track1Credits.length, 0);

		const producerOnTrack1 = track1Credits.find((c: { role: string }) => c.role === 'producer');
		assertEquals(producerOnTrack1?.name, 'Noah "40" Shebib');
	});

	it('preserves ANV from release-level extraartists', async () => {
		const fixture = await Deno.readTextFile('mirmir/test/fixtures/discogs-extraartists-response.json');
		const data = JSON.parse(fixture);

		const positions = data.tracklist.map((t: { position: string }) => t.position);
		const creditMap = buildReleaseLevelCreditMap(data.extraartists, positions);

		const track1Credits = creditMap.get('1') ?? [];
		const noahCredit = track1Credits.find((c: { name: string }) => c.name === 'Noah "40" Shebib');
		assertEquals(noahCredit?.role, 'producer');
		assertEquals(noahCredit?.originalRole, 'Produced By');

		const yachtyArtist: Artist = { id: 890123, name: 'Lil Yachty', anv: 'Yachty', join: '', role: 'Vocals [Backing]', tracks: '1', resource_url: '' };
		const yachtyCredits = convertExtraartistToCredits(yachtyArtist);
		assertEquals(yachtyCredits[0].creditedName, 'Yachty');
		assertEquals(yachtyCredits[0].originalRole, 'Vocals [Backing]');
	});
});
