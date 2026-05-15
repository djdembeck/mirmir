import { mergeResolvableEntityArray, mergeSortedResolvableEntityArray, mergeTrackCredits } from './merge.ts';
import type { ExternalEntityId, ResolvableEntity, TrackCredit } from '@/harmonizer/types.ts';

import { describe, it } from '@std/testing/bdd';
import { assertEquals } from 'std/assert/assert_equals.ts';

function fakeEntity(name: string, ...providers: string[]): ResolvableEntity {
	return {
		name,
		externalIds: providers.map((provider) => ({ provider, type: 'entity', id: provider })),
	};
}

type EntityParams = Parameters<typeof fakeEntity>;

const sortedEntityArrayCases: Array<[string, EntityParams[], EntityParams[][], EntityParams[]]> = [
	['one entity (same name)', [['Test', 'A']], [
		[['Test', 'B']],
		[['Test', 'C']],
	], [['Test', 'A', 'B', 'C']]],
	['two entities (same names, same order)', [['Jane', 'A1'], ['John', 'A2']], [
		[['Jane', 'B1'], ['John', 'B2']],
	], [['Jane', 'A1', 'B1'], ['John', 'A2', 'B2']]],
	['multiple entities (similar names, same order)', [['Jané', 'A1'], ['John', 'A2'], ['T.E.S.T.', 'A3']], [
		[['Jane', 'B1'], ['Jöhn', 'B2'], ['TEST']],
		[['Ja-ne', 'C1'], ['"John"'], ['test', 'C3']],
	], [['Jané', 'A1', 'B1', 'C1'], ['John', 'A2', 'B2'], ['T.E.S.T.', 'A3', 'C3']]],
	['one entity (same name) with duplicate identifiers', [['Test', 'A']], [
		[['Test', 'A']],
		[['Test', 'B', 'B']],
	], [['Test', 'A', 'B']]],
];

const unorderedEntityArrayCases: Array<[string, EntityParams[], EntityParams[][], EntityParams[]]> = [
	['two entities (same names, swapped order)', [['Jane', 'A1'], ['John', 'A2']], [
		[['John', 'B2'], ['Jane', 'B1']],
	], [['Jane', 'A1', 'B1'], ['John', 'A2', 'B2']]],
];

describe('mergeSortedResolvableEntityArray', () => {
	sortedEntityArrayCases.forEach(([description, target, sources, expected]) => {
		it(`merges identifiers of ${description}`, () => {
			const targetEntityArray = target.map((params) => fakeEntity(...params));
			const expectedTargetEntityArray = expected.map((params) => fakeEntity(...params));
			const sourceEntityArrays = sources.map((paramsArray) => paramsArray.map((params) => fakeEntity(...params)));

			mergeSortedResolvableEntityArray(targetEntityArray, sourceEntityArrays);
			assertEquals(targetEntityArray, expectedTargetEntityArray);
		});
	});

	// Proves that deduplication by reference works (which is sufficient for now).
	it('merges identifiers without duplicates when the target entity is among the sources', () => {
		const targetEntityArray = [fakeEntity('Test', 'A')];
		const sourceEntityArrays = [targetEntityArray, [fakeEntity('Test', 'B')]];
		const expectedTargetEntityArray = [fakeEntity('Test', 'A', 'B')];

		mergeSortedResolvableEntityArray(targetEntityArray, sourceEntityArrays);
		assertEquals(targetEntityArray, expectedTargetEntityArray);
	});

	unorderedEntityArrayCases.forEach(([description, target, sources]) => {
		it(`fails to merge identifiers of ${description}`, () => {
			const targetEntityArray = target.map((params) => fakeEntity(...params));
			const expectedTargetEntityArray = target.map((params) => fakeEntity(...params));
			const sourceEntityArrays = sources.map((paramsArray) => paramsArray.map((params) => fakeEntity(...params)));

			mergeSortedResolvableEntityArray(targetEntityArray, sourceEntityArrays);
			assertEquals(targetEntityArray, expectedTargetEntityArray);
		});
	});
});

describe('mergeResolvableEntityArray', () => {
	sortedEntityArrayCases.concat(unorderedEntityArrayCases).forEach(([description, target, sources, expected]) => {
		it(`merges identifiers of ${description}`, () => {
			const targetEntityArray = target.map((params) => fakeEntity(...params));
			const expectedTargetEntityArray = expected.map((params) => fakeEntity(...params));
			const sourceEntityArrays = sources.map((paramsArray) => paramsArray.map((params) => fakeEntity(...params)));

			mergeResolvableEntityArray(targetEntityArray, sourceEntityArrays);
			assertEquals(targetEntityArray, expectedTargetEntityArray);
		});
	});

	it('merges identifiers without duplicates when the target entity is among the sources', () => {
		const targetEntityArray = [fakeEntity('Test', 'A')];
		const sourceEntityArrays = [targetEntityArray, [fakeEntity('Test', 'B')]];
		const expectedTargetEntityArray = [fakeEntity('Test', 'A', 'B')];

		mergeResolvableEntityArray(targetEntityArray, sourceEntityArrays);
		assertEquals(targetEntityArray, expectedTargetEntityArray);
	});
});

function makeCredit(overrides: Partial<TrackCredit> & Pick<TrackCredit, 'name' | 'role' | 'sources'>): TrackCredit {
	return {
		name: overrides.name,
		role: overrides.role,
		sources: overrides.sources,
		creditedName: overrides.creditedName,
		originalRole: overrides.originalRole,
		mbid: overrides.mbid,
		externalIds: overrides.externalIds,
	};
}

describe('mergeTrackCredits', () => {
	it('unions credits from two providers for the same track', () => {
		const target = [
			makeCredit({ name: 'John', role: 'producer', sources: ['Tidal'] }),
			makeCredit({ name: 'Jane', role: 'mixer', sources: ['Tidal'] }),
		];
		const source = [
			makeCredit({ name: 'Bob', role: 'engineer', sources: ['Discogs'] }),
		];

		mergeTrackCredits(target, [source]);

		assertEquals(target.length, 3);
		const names = target.map((c) => c.name);
		assertEquals(names.includes('John'), true);
		assertEquals(names.includes('Jane'), true);
		assertEquals(names.includes('Bob'), true);
	});

	it('deduplicates same person/role across providers', () => {
		const target = [
			makeCredit({ name: 'John', role: 'producer', sources: ['Tidal'] }),
		];
		const source = [
			makeCredit({ name: 'John', role: 'producer', sources: ['Discogs'] }),
		];

		mergeTrackCredits(target, [source]);

		assertEquals(target.length, 1);
		assertEquals(target[0].name, 'John');
		assertEquals(target[0].role, 'producer');
		assertEquals(target[0].sources, ['Tidal', 'Discogs']);
	});

	it('preserves different roles from different providers', () => {
		const target = [
			makeCredit({ name: 'John', role: 'producer', sources: ['Tidal'] }),
		];
		const source = [
			makeCredit({ name: 'Bob', role: 'mixer', sources: ['Discogs'] }),
		];

		mergeTrackCredits(target, [source]);

		assertEquals(target.length, 2);
		const producer = target.find((c) => c.role === 'producer');
		const mixer = target.find((c) => c.role === 'mixer');
		assertEquals(producer?.name, 'John');
		assertEquals(mixer?.name, 'Bob');
	});

	it('creates separate credits for same person with different role', () => {
		const target = [
			makeCredit({ name: 'John', role: 'producer', sources: ['Tidal'] }),
		];
		const source = [
			makeCredit({ name: 'John', role: 'mixer', sources: ['Discogs'] }),
		];

		mergeTrackCredits(target, [source]);

		assertEquals(target.length, 2);
		const roles = target.map((c) => c.role);
		assertEquals(roles.includes('producer'), true);
		assertEquals(roles.includes('mixer'), true);
	});

	it('merges externalIds when deduplicating', () => {
		const tidalId: ExternalEntityId = { provider: 'Tidal', type: 'artist', id: '123' };
		const discogsId: ExternalEntityId = { provider: 'Discogs', type: 'artist', id: '456' };
		const target = [
			makeCredit({ name: 'John', role: 'producer', sources: ['Tidal'], externalIds: [tidalId] }),
		];
		const source = [
			makeCredit({ name: 'John', role: 'producer', sources: ['Discogs'], externalIds: [discogsId] }),
		];

		mergeTrackCredits(target, [source]);

		assertEquals(target.length, 1);
		assertEquals(target[0].externalIds?.length, 2);
		const providers = target[0].externalIds!.map((id) => id.provider);
		assertEquals(providers.includes('Tidal'), true);
		assertEquals(providers.includes('Discogs'), true);
	});

	it('preserves creditedName from the most specific source', () => {
		const target = [
			makeCredit({ name: 'John', role: 'producer', sources: ['Tidal'] }),
		];
		const source = [
			makeCredit({ name: 'John', role: 'producer', sources: ['Discogs'], creditedName: 'J. Smith' }),
		];

		mergeTrackCredits(target, [source]);

		assertEquals(target[0].creditedName, 'J. Smith');
	});

	it('keeps existing creditedName when source has none', () => {
		const target = [
			makeCredit({ name: 'John', role: 'producer', sources: ['Tidal'], creditedName: 'J. Smith' }),
		];
		const source = [
			makeCredit({ name: 'John', role: 'producer', sources: ['Discogs'] }),
		];

		mergeTrackCredits(target, [source]);

		assertEquals(target[0].creditedName, 'J. Smith');
	});

	it('deduplicates externalIds by provider+type+id', () => {
		const duplicateId: ExternalEntityId = { provider: 'Tidal', type: 'artist', id: '123' };
		const target = [
			makeCredit({ name: 'John', role: 'producer', sources: ['Tidal'], externalIds: [duplicateId] }),
		];
		const source = [
			makeCredit({ name: 'John', role: 'producer', sources: ['Tidal'], externalIds: [duplicateId] }),
		];

		mergeTrackCredits(target, [source]);

		assertEquals(target[0].externalIds?.length, 1);
	});

	it('handles empty source arrays', () => {
		const target = [
			makeCredit({ name: 'John', role: 'producer', sources: ['Tidal'] }),
		];

		mergeTrackCredits(target, [undefined, []]);

		assertEquals(target.length, 1);
		assertEquals(target[0].name, 'John');
	});

	it('is case-insensitive for deduplication', () => {
		const target = [
			makeCredit({ name: 'John', role: 'Producer', sources: ['Tidal'] }),
		];
		const source = [
			makeCredit({ name: 'john', role: 'producer', sources: ['Discogs'] }),
		];

		mergeTrackCredits(target, [source]);

		assertEquals(target.length, 1);
		assertEquals(target[0].sources, ['Tidal', 'Discogs']);
	});

	it('merges mbid from source when target has none', () => {
		const target = [
			makeCredit({ name: 'John', role: 'producer', sources: ['Tidal'] }),
		];
		const source = [
			makeCredit({ name: 'John', role: 'producer', sources: ['Discogs'], mbid: 'abc-123' }),
		];

		mergeTrackCredits(target, [source]);

		assertEquals(target[0].mbid, 'abc-123');
	});

	it('merges originalRole from source when target has none', () => {
		const target = [
			makeCredit({ name: 'John', role: 'producer', sources: ['Tidal'] }),
		];
		const source = [
			makeCredit({ name: 'John', role: 'producer', sources: ['Discogs'], originalRole: 'Co-Producer' }),
		];

		mergeTrackCredits(target, [source]);

		assertEquals(target[0].originalRole, 'Co-Producer');
	});
});
