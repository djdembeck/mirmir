/**
 * Unified Credit→MB Role Mapping Table
 *
 * Converts free-form role strings from Tidal and Discogs into
 * MusicBrainz relationship type IDs and attribute type IDs.
 */

// ── MB Relationship Type UUIDs ──────────────────────────────────────────────

/** Confirmed MusicBrainz relationship type IDs */
export const MB_RELATIONSHIP_TYPES = {
	producer: '5c0ceac3-feb4-41f0-868d-dc06f6e27fc0',
	engineer: '5dcc52af-7064-4051-8d62-7d80f4c3c907',
	mixer: '3e3102e1-1896-4f50-b5b2-dd9824e46efe',
	mastering: '8c9b9e5e-59e9-4d4c-9609-039c8e4f061d',
	recording: '6e6e9a6e-1ee4-4b8d-ba4f-e7cc1a8473e5',
	performer: '28e41040-6cbf-428d-b561-4e0c59a0e7b6',
	instruments: 'fd0731c3-6fff-4516-9a22-8fe8c6e4a7a6',
	vocalist: 'd3a8e3f3-6371-4345-8c3c-797c4a6c14d3',
	arranger: '22661fb8-cdb7-4f67-8385-b2a8be6c9f0d', // MusicBrainz arranger relationship type
	remixer: '', // UNCONFIRMED - needs lookup from MB server SQL
	djmixer: '', // UNCONFIRMED - needs lookup from MB server SQL
	orchestrator: '', // UNCONFIRMED - needs lookup from MB server SQL
	editor: '', // UNCONFIRMED - needs lookup from MB server SQL
	programmer: '', // UNCONFIRMED - needs lookup from MB server SQL
} as const;

/** Confirmed MusicBrainz attribute type IDs */
export const MB_ATTRIBUTE_TYPES = {
	additional: '0a5341f8-3b1d-4f99-a0c6-26b7f4e42c7f',
	co: 'ac6f6b4c-a4ec-4483-a04e-9f425a914573',
	guest: 'b3045913-62ac-433e-9211-ac683cdf6b5c',
	solo: '1c186ed2-8932-424b-8d69-0e8f4f8be8b0',
	keyboard: '95b0c3d2-9606-4ef5-a019-9b7437f3adda',
	drums: '3bccb7eb-cbca-42cd-b0ac-a5e959df7221',
	executive: 'e0039285-6667-4f94-80d6-aa6520c6d359', // executive attribute
	electric: '', // UNCONFIRMED - needs lookup from MB server SQL
	acoustic: '', // UNCONFIRMED - needs lookup from MB server SQL
	backing: '', // UNCONFIRMED - needs lookup from MB server SQL
	lead: '', // UNCONFIRMED - needs lookup from MB server SQL
	bass: '', // UNCONFIRMED - needs lookup from MB server SQL
	guitar: '', // UNCONFIRMED - needs lookup from MB server SQL
	piano: '', // UNCONFIRMED - needs lookup from MB server SQL
	vocals: '', // UNCONFIRMED - needs lookup from MB server SQL
	violin: '', // UNCONFIRMED - needs lookup from MB server SQL
	cello: '', // UNCONFIRMED - needs lookup from MB server SQL
	saxophone: '', // UNCONFIRMED - needs lookup from MB server SQL
	trumpet: '', // UNCONFIRMED - needs lookup from MB server SQL
	flute: '', // UNCONFIRMED - needs lookup from MB server SQL
	harp: '', // UNCONFIRMED - needs lookup from MB server SQL
	organ: '', // UNCONFIRMED - needs lookup from MB server SQL
	synthesizer: '', // UNCONFIRMED - needs lookup from MB server SQL
	percussion: '', // UNCONFIRMED - needs lookup from MB server SQL
	horn: '', // UNCONFIRMED - needs lookup from MB server SQL
} as const;

// ── Types ───────────────────────────────────────────────────────────────────

export interface MBAttribute {
	type: string;
	typeId: string;
}

export interface RoleMapping {
	/** Original role string from the source */
	sourceRole: string;
	/** Human-readable MB relationship type name */
	mbRelationshipType: string;
	/** MB relationship type UUID */
	mbRelationshipId: string;
	/** MB attribute types to attach to the relationship */
	mbAttributes?: MBAttribute[];
	/** Whether this role is work-level (Composer, Lyricist, Songwriter) */
	workLevel?: boolean;
	/** Whether this role cannot be mapped to any MB relationship */
	unmappable?: boolean;
}

// ── Tidal Role Map ──────────────────────────────────────────────────────────

export const tidalRoleMap: Map<string, RoleMapping> = new Map([
	['Co-Producer', {
		sourceRole: 'Co-Producer',
		mbRelationshipType: 'producer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.producer,
		mbAttributes: [{ type: 'co', typeId: MB_ATTRIBUTE_TYPES.co }],
	}],
	['Composer', {
		sourceRole: 'Composer',
		mbRelationshipType: 'composer',
		mbRelationshipId: '', // placeholder; work-level
		workLevel: true,
	}],
	['Drum Kit', {
		sourceRole: 'Drum Kit',
		mbRelationshipType: 'performer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.performer,
		mbAttributes: [{ type: 'drums', typeId: MB_ATTRIBUTE_TYPES.drums }],
	}],
	['Keyboard', {
		sourceRole: 'Keyboard',
		mbRelationshipType: 'performer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.performer,
		mbAttributes: [{ type: 'keyboard', typeId: MB_ATTRIBUTE_TYPES.keyboard }],
	}],
	['Lyricist', {
		sourceRole: 'Lyricist',
		mbRelationshipType: 'lyricist',
		mbRelationshipId: '', // placeholder; work-level
		workLevel: true,
	}],
	['Mastering Engineer', {
		sourceRole: 'Mastering Engineer',
		mbRelationshipType: 'mastering',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.mastering,
	}],
	['Producer', {
		sourceRole: 'Producer',
		mbRelationshipType: 'producer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.producer,
	}],
	['AdditionalProducer', {
		sourceRole: 'AdditionalProducer',
		mbRelationshipType: 'producer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.producer,
		mbAttributes: [{ type: 'additional', typeId: MB_ATTRIBUTE_TYPES.additional }],
	}],
	['Featured Artist', {
		sourceRole: 'Featured Artist',
		mbRelationshipType: 'performer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.performer,
		mbAttributes: [{ type: 'guest', typeId: MB_ATTRIBUTE_TYPES.guest }],
	}],
	['Mixing', {
		sourceRole: 'Mixing',
		mbRelationshipType: 'mixer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.mixer,
	}],
	['Mixing Engineer', {
		sourceRole: 'Mixing Engineer',
		mbRelationshipType: 'mixer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.mixer,
	}],
	['Recording Engineer', {
		sourceRole: 'Recording Engineer',
		mbRelationshipType: 'recording',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.recording,
	}],
]);

// ── Discogs Role Map ────────────────────────────────────────────────────────

export const discogsRoleMap: Map<string, RoleMapping> = new Map([
	// Production
	['Produced By', {
		sourceRole: 'Produced By',
		mbRelationshipType: 'producer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.producer,
	}],
	['Co-Produced By', {
		sourceRole: 'Co-Produced By',
		mbRelationshipType: 'producer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.producer,
		mbAttributes: [{ type: 'co', typeId: MB_ATTRIBUTE_TYPES.co }],
	}],
	['Executive Producer', {
		sourceRole: 'Executive Producer',
		mbRelationshipType: 'producer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.producer,
		mbAttributes: [{ type: 'executive', typeId: MB_ATTRIBUTE_TYPES.executive }],
	}],
	// Engineering
	['Engineer', {
		sourceRole: 'Engineer',
		mbRelationshipType: 'engineer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.engineer,
	}],
	['Mixed By', {
		sourceRole: 'Mixed By',
		mbRelationshipType: 'mixer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.mixer,
	}],
	['Mastered By', {
		sourceRole: 'Mastered By',
		mbRelationshipType: 'mastering',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.mastering,
	}],
	['Recorded By', {
		sourceRole: 'Recorded By',
		mbRelationshipType: 'recording',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.recording,
	}],
	// Work-level (skip for recording injection)
	['Songwriter', {
		sourceRole: 'Songwriter',
		mbRelationshipType: 'songwriter',
		mbRelationshipId: '', // placeholder; work-level
		workLevel: true,
	}],
	['Composer', {
		sourceRole: 'Composer',
		mbRelationshipType: 'composer',
		mbRelationshipId: '', // placeholder; work-level
		workLevel: true,
	}],
	['Lyricist', {
		sourceRole: 'Lyricist',
		mbRelationshipType: 'lyricist',
		mbRelationshipId: '', // placeholder; work-level
		workLevel: true,
	}],
	// Performance
	['Performer', {
		sourceRole: 'Performer',
		mbRelationshipType: 'performer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.performer,
	}],
	['Remixer', {
		sourceRole: 'Remixer',
		mbRelationshipType: 'remixer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.remixer,
	}],
	['DJ Mix', {
		sourceRole: 'DJ Mix',
		mbRelationshipType: 'djmixer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.djmixer,
	}],
	// Arrangement
	['Arranged By', {
		sourceRole: 'Arranged By',
		mbRelationshipType: 'arranger',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.arranger,
	}],
	['Orchestrated By', {
		sourceRole: 'Orchestrated By',
		mbRelationshipType: 'orchestrator',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.orchestrator,
	}],
	// Editing & Programming
	['Edited By', {
		sourceRole: 'Edited By',
		mbRelationshipType: 'editor',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.editor,
	}],
	['Programming', {
		sourceRole: 'Programming',
		mbRelationshipType: 'programmer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.programmer,
	}],
	// Instruments with bracket notation
	['Guitar', {
		sourceRole: 'Guitar',
		mbRelationshipType: 'performer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.performer,
		mbAttributes: [{ type: 'guitar', typeId: MB_ATTRIBUTE_TYPES.guitar }],
	}],
	['Guitar [Electric]', {
		sourceRole: 'Guitar [Electric]',
		mbRelationshipType: 'performer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.performer,
		mbAttributes: [
			{ type: 'guitar', typeId: MB_ATTRIBUTE_TYPES.guitar },
			{ type: 'electric', typeId: MB_ATTRIBUTE_TYPES.electric },
		],
	}],
	['Guitar [Acoustic]', {
		sourceRole: 'Guitar [Acoustic]',
		mbRelationshipType: 'performer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.performer,
		mbAttributes: [
			{ type: 'guitar', typeId: MB_ATTRIBUTE_TYPES.guitar },
			{ type: 'acoustic', typeId: MB_ATTRIBUTE_TYPES.acoustic },
		],
	}],
	['Guitar [Bass]', {
		sourceRole: 'Guitar [Bass]',
		mbRelationshipType: 'performer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.performer,
		mbAttributes: [
			{ type: 'guitar', typeId: MB_ATTRIBUTE_TYPES.guitar },
			{ type: 'bass', typeId: MB_ATTRIBUTE_TYPES.bass },
		],
	}],
	['Vocals', {
		sourceRole: 'Vocals',
		mbRelationshipType: 'performer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.performer,
		mbAttributes: [{ type: 'vocals', typeId: MB_ATTRIBUTE_TYPES.vocals }],
	}],
	['Vocals [Backing]', {
		sourceRole: 'Vocals [Backing]',
		mbRelationshipType: 'performer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.performer,
		mbAttributes: [
			{ type: 'vocals', typeId: MB_ATTRIBUTE_TYPES.vocals },
			{ type: 'backing', typeId: MB_ATTRIBUTE_TYPES.backing },
		],
	}],
	['Vocals [Lead]', {
		sourceRole: 'Vocals [Lead]',
		mbRelationshipType: 'performer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.performer,
		mbAttributes: [
			{ type: 'vocals', typeId: MB_ATTRIBUTE_TYPES.vocals },
			{ type: 'lead', typeId: MB_ATTRIBUTE_TYPES.lead },
		],
	}],
	['Piano', {
		sourceRole: 'Piano',
		mbRelationshipType: 'performer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.performer,
		mbAttributes: [{ type: 'piano', typeId: MB_ATTRIBUTE_TYPES.piano }],
	}],
	['Piano [Rhodes]', {
		sourceRole: 'Piano [Rhodes]',
		mbRelationshipType: 'performer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.performer,
		mbAttributes: [
			{ type: 'piano', typeId: MB_ATTRIBUTE_TYPES.piano },
			{ type: 'electric', typeId: MB_ATTRIBUTE_TYPES.electric },
		],
	}],
	// More instruments
	['Bass', {
		sourceRole: 'Bass',
		mbRelationshipType: 'performer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.performer,
		mbAttributes: [{ type: 'bass', typeId: MB_ATTRIBUTE_TYPES.bass }],
	}],
	['Drums', {
		sourceRole: 'Drums',
		mbRelationshipType: 'performer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.performer,
		mbAttributes: [{ type: 'drums', typeId: MB_ATTRIBUTE_TYPES.drums }],
	}],
	['Violin', {
		sourceRole: 'Violin',
		mbRelationshipType: 'performer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.performer,
		mbAttributes: [{ type: 'violin', typeId: MB_ATTRIBUTE_TYPES.violin }],
	}],
	['Cello', {
		sourceRole: 'Cello',
		mbRelationshipType: 'performer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.performer,
		mbAttributes: [{ type: 'cello', typeId: MB_ATTRIBUTE_TYPES.cello }],
	}],
	['Saxophone', {
		sourceRole: 'Saxophone',
		mbRelationshipType: 'performer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.performer,
		mbAttributes: [{ type: 'saxophone', typeId: MB_ATTRIBUTE_TYPES.saxophone }],
	}],
	['Trumpet', {
		sourceRole: 'Trumpet',
		mbRelationshipType: 'performer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.performer,
		mbAttributes: [{ type: 'trumpet', typeId: MB_ATTRIBUTE_TYPES.trumpet }],
	}],
	['Flute', {
		sourceRole: 'Flute',
		mbRelationshipType: 'performer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.performer,
		mbAttributes: [{ type: 'flute', typeId: MB_ATTRIBUTE_TYPES.flute }],
	}],
	['Harp', {
		sourceRole: 'Harp',
		mbRelationshipType: 'performer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.performer,
		mbAttributes: [{ type: 'harp', typeId: MB_ATTRIBUTE_TYPES.harp }],
	}],
	['Organ', {
		sourceRole: 'Organ',
		mbRelationshipType: 'performer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.performer,
		mbAttributes: [{ type: 'organ', typeId: MB_ATTRIBUTE_TYPES.organ }],
	}],
	['Synthesizer', {
		sourceRole: 'Synthesizer',
		mbRelationshipType: 'performer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.performer,
		mbAttributes: [{ type: 'synthesizer', typeId: MB_ATTRIBUTE_TYPES.synthesizer }],
	}],
	['Percussion', {
		sourceRole: 'Percussion',
		mbRelationshipType: 'performer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.performer,
		mbAttributes: [{ type: 'percussion', typeId: MB_ATTRIBUTE_TYPES.percussion }],
	}],
	['Horn', {
		sourceRole: 'Horn',
		mbRelationshipType: 'performer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.performer,
		mbAttributes: [{ type: 'horn', typeId: MB_ATTRIBUTE_TYPES.horn }],
	}],
	['Keyboards', {
		sourceRole: 'Keyboards',
		mbRelationshipType: 'performer',
		mbRelationshipId: MB_RELATIONSHIP_TYPES.performer,
		mbAttributes: [{ type: 'keyboard', typeId: MB_ATTRIBUTE_TYPES.keyboard }],
	}],
]);

// ── Bracket Notation Attribute Map ──────────────────────────────────────────

/** Maps bracket notation qualifiers to MB attribute types */
const bracketAttributeMap: Map<string, MBAttribute> = new Map([
	['Electric', { type: 'electric', typeId: MB_ATTRIBUTE_TYPES.electric }],
	['Acoustic', { type: 'acoustic', typeId: MB_ATTRIBUTE_TYPES.acoustic }],
	['Backing', { type: 'backing', typeId: MB_ATTRIBUTE_TYPES.backing }],
	['Lead', { type: 'lead', typeId: MB_ATTRIBUTE_TYPES.lead }],
	['Bass', { type: 'bass', typeId: MB_ATTRIBUTE_TYPES.bass }],
	['Rhodes', { type: 'electric', typeId: MB_ATTRIBUTE_TYPES.electric }],
	['Solo', { type: 'solo', typeId: MB_ATTRIBUTE_TYPES.solo }],
	['Guest', { type: 'guest', typeId: MB_ATTRIBUTE_TYPES.guest }],
	['Co', { type: 'co', typeId: MB_ATTRIBUTE_TYPES.co }],
	['Additional', { type: 'additional', typeId: MB_ATTRIBUTE_TYPES.additional }],
]);

// ── Utility Functions ───────────────────────────────────────────────────────

/**
 * Parse Discogs bracket notation: "Guitar [Electric]" → { baseRole: "Guitar", attributes: ["Electric"] }
 * Handles multiple brackets: "Guitar [Electric][Slide]" → { baseRole: "Guitar", attributes: ["Electric", "Slide"] }
 */
export function parseBracketNotation(role: string): { baseRole: string; attributes: string[] } {
	const bracketRegex = /\[([^\]]+)\]/g;
	const attributes: string[] = [];
	let match: RegExpExecArray | null;

	while ((match = bracketRegex.exec(role)) !== null) {
		attributes.push(match[1]);
	}

	const baseRole = role.replace(/\s*\[[^\]]*\]\s*/g, '').trim();
	return { baseRole, attributes };
}

/**
 * Split compound roles: "Produced By, Mixed By" → ["Produced By", "Mixed By"]
 * Also handles " & " separator: "Produced By & Mixed By" → ["Produced By", "Mixed By"]
 */
export function splitCompoundRoles(role: string): string[] {
	const parts = role.split(/,\s*|\s+&\s+/);
	return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

/**
 * Check if a role is work-level (should be skipped for recording-level injection in v1).
 * Work-level roles include Composer, Lyricist, Songwriter, and their variants.
 */
export function isWorkLevelRole(role: string): boolean {
	const workLevelPatterns = [
		/^composer$/i,
		/^lyricist$/i,
		/^songwriter$/i,
		/^writer$/i,
		/^composed by$/i,
		/^written by$/i,
		/^lyrics by$/i,
		/^words by$/i,
		/^music by$/i,
	];

	return workLevelPatterns.some((pattern) => pattern.test(role.trim()));
}

/**
 * Map a role string from a given source to a MusicBrainz RoleMapping.
 * Falls back to bracket notation parsing for unmapped Discogs roles,
 * and flags completely unmappable roles with `unmappable: true`.
 */
export function mapRole(role: string, source: 'Tidal' | 'Discogs'): RoleMapping {
	const roleMap = source === 'Tidal' ? tidalRoleMap : discogsRoleMap;

	const direct = roleMap.get(role);
	if (direct) return direct;

	if (source === 'Discogs') {
		const { baseRole, attributes } = parseBracketNotation(role);
		const baseMapping = discogsRoleMap.get(baseRole);
		if (baseMapping) {
			const bracketAttrs = attributes
				.map((attr) => bracketAttributeMap.get(attr))
				.filter((a): a is MBAttribute => a !== undefined);

			return {
				...baseMapping,
				sourceRole: role,
				mbAttributes: [...(baseMapping.mbAttributes ?? []), ...bracketAttrs],
			};
		}
	}

	if (isWorkLevelRole(role)) {
		return {
			sourceRole: role,
			mbRelationshipType: 'work-level',
			mbRelationshipId: '',
			workLevel: true,
		};
	}

	return {
		sourceRole: role,
		mbRelationshipType: 'unknown',
		mbRelationshipId: '',
		unmappable: true,
	};
}
