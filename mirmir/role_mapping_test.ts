import { assertEquals } from 'std/assert/assert_equals.ts';
import { assertNotEquals } from 'std/assert/assert_not_equals.ts';
import { describe, it } from '@std/testing/bdd';
import {
	mapRole,
	parseBracketNotation,
	splitCompoundRoles,
	isWorkLevelRole,
	tidalRoleMap,
	discogsRoleMap,
	MB_RELATIONSHIP_TYPES,
	MB_ATTRIBUTE_TYPES,
} from './role_mapping.ts';

describe('Tidal role mapping', () => {
	it('maps "Producer" to MB producer relationship', () => {
		const result = mapRole('Producer', 'Tidal');
		assertEquals(result.mbRelationshipType, 'producer');
		assertEquals(result.mbRelationshipId, MB_RELATIONSHIP_TYPES.producer);
		assertEquals(result.unmappable, undefined);
	});

	it('maps "Featured Artist" to MB performer with guest attribute', () => {
		const result = mapRole('Featured Artist', 'Tidal');
		assertEquals(result.mbRelationshipType, 'performer');
		assertEquals(result.mbRelationshipId, MB_RELATIONSHIP_TYPES.performer);
		assertEquals(result.mbAttributes, [{ type: 'guest', typeId: MB_ATTRIBUTE_TYPES.guest }]);
	});

	it('maps "AdditionalProducer" to MB producer with additional attribute', () => {
		const result = mapRole('AdditionalProducer', 'Tidal');
		assertEquals(result.mbRelationshipType, 'producer');
		assertEquals(result.mbRelationshipId, MB_RELATIONSHIP_TYPES.producer);
		assertEquals(result.mbAttributes, [{ type: 'additional', typeId: MB_ATTRIBUTE_TYPES.additional }]);
	});

	it('maps "Co-Producer" to MB producer with co attribute', () => {
		const result = mapRole('Co-Producer', 'Tidal');
		assertEquals(result.mbRelationshipType, 'producer');
		assertEquals(result.mbRelationshipId, MB_RELATIONSHIP_TYPES.producer);
		assertEquals(result.mbAttributes, [{ type: 'co', typeId: MB_ATTRIBUTE_TYPES.co }]);
	});

	it('maps "Drum Kit" to MB performer with drums attribute', () => {
		const result = mapRole('Drum Kit', 'Tidal');
		assertEquals(result.mbRelationshipType, 'performer');
		assertEquals(result.mbAttributes, [{ type: 'drums', typeId: MB_ATTRIBUTE_TYPES.drums }]);
	});

	it('maps "Keyboard" to MB performer with keyboard attribute', () => {
		const result = mapRole('Keyboard', 'Tidal');
		assertEquals(result.mbRelationshipType, 'performer');
		assertEquals(result.mbAttributes, [{ type: 'keyboard', typeId: MB_ATTRIBUTE_TYPES.keyboard }]);
	});

	it('maps "Mastering Engineer" to MB mastering', () => {
		const result = mapRole('Mastering Engineer', 'Tidal');
		assertEquals(result.mbRelationshipType, 'mastering');
		assertEquals(result.mbRelationshipId, MB_RELATIONSHIP_TYPES.mastering);
	});

	it('maps "Mixing" and "Mixing Engineer" to MB mixer', () => {
		assertEquals(mapRole('Mixing', 'Tidal').mbRelationshipType, 'mixer');
		assertEquals(mapRole('Mixing Engineer', 'Tidal').mbRelationshipType, 'mixer');
	});

	it('maps "Recording Engineer" to MB recording', () => {
		const result = mapRole('Recording Engineer', 'Tidal');
		assertEquals(result.mbRelationshipType, 'recording');
		assertEquals(result.mbRelationshipId, MB_RELATIONSHIP_TYPES.recording);
	});
});

describe('Discogs role mapping', () => {
	it('maps "Produced By" to MB producer relationship', () => {
		const result = mapRole('Produced By', 'Discogs');
		assertEquals(result.mbRelationshipType, 'producer');
		assertEquals(result.mbRelationshipId, MB_RELATIONSHIP_TYPES.producer);
	});

	it('maps "Mixed By" to MB mixer', () => {
		const result = mapRole('Mixed By', 'Discogs');
		assertEquals(result.mbRelationshipType, 'mixer');
		assertEquals(result.mbRelationshipId, MB_RELATIONSHIP_TYPES.mixer);
	});

	it('maps "Co-Produced By" to MB producer with co attribute', () => {
		const result = mapRole('Co-Produced By', 'Discogs');
		assertEquals(result.mbRelationshipType, 'producer');
		assertEquals(result.mbAttributes, [{ type: 'co', typeId: MB_ATTRIBUTE_TYPES.co }]);
	});

	it('maps "Executive Producer" to MB producer with executive attribute', () => {
		const result = mapRole('Executive Producer', 'Discogs');
		assertEquals(result.mbRelationshipType, 'producer');
		assertEquals(result.mbAttributes, [{ type: 'executive', typeId: MB_ATTRIBUTE_TYPES.executive }]);
	});

	it('maps "Mastered By" to MB mastering', () => {
		const result = mapRole('Mastered By', 'Discogs');
		assertEquals(result.mbRelationshipType, 'mastering');
	});

	it('maps "Recorded By" to MB recording', () => {
		const result = mapRole('Recorded By', 'Discogs');
		assertEquals(result.mbRelationshipType, 'recording');
	});

	it('maps "Arranged By" to MB arranger', () => {
		const result = mapRole('Arranged By', 'Discogs');
		assertEquals(result.mbRelationshipType, 'arranger');
	});

	it('maps "Remixer" to MB remixer', () => {
		const result = mapRole('Remixer', 'Discogs');
		assertEquals(result.mbRelationshipType, 'remixer');
	});

	it('maps "DJ Mix" to MB djmixer', () => {
		const result = mapRole('DJ Mix', 'Discogs');
		assertEquals(result.mbRelationshipType, 'djmixer');
	});
});

describe('bracket notation parsing', () => {
	it('parses "Guitar [Electric]" into base role and attribute', () => {
		const result = parseBracketNotation('Guitar [Electric]');
		assertEquals(result.baseRole, 'Guitar');
		assertEquals(result.attributes, ['Electric']);
	});

	it('parses "Vocals [Backing]" into base role and attribute', () => {
		const result = parseBracketNotation('Vocals [Backing]');
		assertEquals(result.baseRole, 'Vocals');
		assertEquals(result.attributes, ['Backing']);
	});

	it('parses "Piano [Rhodes]" into base role and attribute', () => {
		const result = parseBracketNotation('Piano [Rhodes]');
		assertEquals(result.baseRole, 'Piano');
		assertEquals(result.attributes, ['Rhodes']);
	});

	it('handles roles without brackets', () => {
		const result = parseBracketNotation('Producer');
		assertEquals(result.baseRole, 'Producer');
		assertEquals(result.attributes, []);
	});

	it('handles multiple bracket attributes', () => {
		const result = parseBracketNotation('Guitar [Electric][Slide]');
		assertEquals(result.baseRole, 'Guitar');
		assertEquals(result.attributes, ['Electric', 'Slide']);
	});

	it('resolves bracket notation via mapRole for Discogs', () => {
		const result = mapRole('Guitar [Electric]', 'Discogs');
		assertEquals(result.mbRelationshipType, 'performer');
		assertEquals(result.mbAttributes, [
			{ type: 'guitar', typeId: MB_ATTRIBUTE_TYPES.guitar },
			{ type: 'electric', typeId: MB_ATTRIBUTE_TYPES.electric },
		]);
	});
});

describe('compound role splitting', () => {
	it('splits "Produced By, Mixed By" into two roles', () => {
		const result = splitCompoundRoles('Produced By, Mixed By');
		assertEquals(result, ['Produced By', 'Mixed By']);
	});

	it('splits "Produced By & Mixed By" into two roles', () => {
		const result = splitCompoundRoles('Produced By & Mixed By');
		assertEquals(result, ['Produced By', 'Mixed By']);
	});

	it('returns single role when no separator present', () => {
		const result = splitCompoundRoles('Producer');
		assertEquals(result, ['Producer']);
	});

	it('handles three compound roles', () => {
		const result = splitCompoundRoles('Produced By, Mixed By, Mastered By');
		assertEquals(result, ['Produced By', 'Mixed By', 'Mastered By']);
	});
});

describe('unmappable roles', () => {
	it('flags unknown Tidal role as unmappable', () => {
		const result = mapRole('SomeRandomRole', 'Tidal');
		assertEquals(result.unmappable, true);
		assertEquals(result.sourceRole, 'SomeRandomRole');
	});

	it('flags unknown Discogs role as unmappable', () => {
		const result = mapRole('Foobar Technician', 'Discogs');
		assertEquals(result.unmappable, true);
		assertEquals(result.sourceRole, 'Foobar Technician');
	});
});

describe('work-level roles', () => {
	it('marks Composer as work-level from Tidal', () => {
		const result = mapRole('Composer', 'Tidal');
		assertEquals(result.workLevel, true);
	});

	it('marks Lyricist as work-level from Tidal', () => {
		const result = mapRole('Lyricist', 'Tidal');
		assertEquals(result.workLevel, true);
	});

	it('marks Composer as work-level from Discogs', () => {
		const result = mapRole('Composer', 'Discogs');
		assertEquals(result.workLevel, true);
	});

	it('marks Lyricist as work-level from Discogs', () => {
		const result = mapRole('Lyricist', 'Discogs');
		assertEquals(result.workLevel, true);
	});

	it('marks Songwriter as work-level from Discogs', () => {
		const result = mapRole('Songwriter', 'Discogs');
		assertEquals(result.workLevel, true);
	});

	it('does NOT mark Producer as work-level', () => {
		const result = mapRole('Producer', 'Tidal');
		assertEquals(result.workLevel, undefined);
	});

	it('isWorkLevelRole detects "Composed By"', () => {
		assertEquals(isWorkLevelRole('Composed By'), true);
	});

	it('isWorkLevelRole detects "Written By"', () => {
		assertEquals(isWorkLevelRole('Written By'), true);
	});

	it('isWorkLevelRole returns false for "Producer"', () => {
		assertEquals(isWorkLevelRole('Producer'), false);
	});
});

describe('role map coverage', () => {
	it('tidalRoleMap has all 12 confirmed Tidal roles', () => {
		const expectedRoles = [
			'Co-Producer', 'Composer', 'Drum Kit', 'Keyboard', 'Lyricist',
			'Mastering Engineer', 'Producer', 'AdditionalProducer', 'Featured Artist',
			'Mixing', 'Mixing Engineer', 'Recording Engineer',
		];
		for (const role of expectedRoles) {
			assertNotEquals(tidalRoleMap.get(role), undefined, `Missing Tidal role: ${role}`);
		}
		assertEquals(tidalRoleMap.size, expectedRoles.length);
	});

	it('discogsRoleMap has 30+ entries', () => {
		assertEquals(discogsRoleMap.size >= 30, true);
	});
});

describe('UUID correctness', () => {
	const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

	it('confirmed MB_RELATIONSHIP_TYPES have valid UUIDs', () => {
		const confirmed = ['producer', 'engineer', 'mixer', 'mastering', 'recording', 'performer', 'instruments', 'vocalist', 'arranger'] as const;
		for (const key of confirmed) {
			const id = MB_RELATIONSHIP_TYPES[key];
			assertEquals(UUID_RE.test(id), true, `MB_RELATIONSHIP_TYPES.${key} should be valid UUID, got: "${id}"`);
		}
	});

	it('unconfirmed MB_RELATIONSHIP_TYPES have empty string', () => {
		const unconfirmed = ['remixer', 'djmixer', 'orchestrator', 'editor', 'programmer'] as const;
		for (const key of unconfirmed) {
			assertEquals(MB_RELATIONSHIP_TYPES[key], '', `MB_RELATIONSHIP_TYPES.${key} should be empty (unconfirmed)`);
		}
	});

	it('confirmed MB_ATTRIBUTE_TYPES have valid UUIDs', () => {
		const confirmed = ['additional', 'co', 'guest', 'solo', 'keyboard', 'drums', 'executive'] as const;
		for (const key of confirmed) {
			const id = MB_ATTRIBUTE_TYPES[key];
			assertEquals(UUID_RE.test(id), true, `MB_ATTRIBUTE_TYPES.${key} should be valid UUID, got: "${id}"`);
		}
	});

	it('unconfirmed MB_ATTRIBUTE_TYPES have empty string', () => {
		const unconfirmed = ['electric', 'acoustic', 'backing', 'lead', 'bass', 'guitar', 'piano', 'vocals', 'violin', 'cello', 'saxophone', 'trumpet', 'flute', 'harp', 'organ', 'synthesizer', 'percussion', 'horn'] as const;
		for (const key of unconfirmed) {
			assertEquals(MB_ATTRIBUTE_TYPES[key], '', `MB_ATTRIBUTE_TYPES.${key} should be empty (unconfirmed)`);
		}
	});
});
