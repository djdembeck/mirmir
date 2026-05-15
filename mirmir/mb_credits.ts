/**
 * MusicBrainz Provider — Read Existing Artist-Recording Relationships
 *
 * Fetches existing artist-recording relationships from MusicBrainz
 * for a release's tracks, with proper rate limiting (1 req/sec).
 *
 * This module is OPTIONAL — triggered by UI button, not automatic on every lookup.
 */

import type { ExternalEntityId, TrackCredit } from '@/harmonizer/types.ts';

/** Maps MB API relationship type names to normalized role strings. */
const MB_REL_TYPE_TO_ROLE: Record<string, string> = {
	producer: 'producer',
	engineer: 'engineer',
	mix: 'mixer',
	mixer: 'mixer',
	mastering: 'mastering',
	recording: 'recording',
	performer: 'performer',
	instruments: 'instruments',
	vocal: 'vocalist',
	vocals: 'vocalist',
	arranger: 'arranger',
	orchestrator: 'orchestrator',
	remixer: 'remixer',
	editor: 'editor',
	programmer: 'programmer',
	djmix: 'djmixer',
};

/**
 * Normalizes an MB relationship type name to a consistent role string.
 * Unknown types are preserved as-is for review.
 */
export function normalizeRole(mbRelType: string): string {
	return MB_REL_TYPE_TO_ROLE[mbRelType] ?? mbRelType;
}

/** MB API recording response with artist-rels include. */
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
	relations?: Array<MBArtistRelation>;
}

/** A single artist-recording relationship from the MB API. */
export interface MBArtistRelation {
	type: string;
	typeId?: string;
	direction?: string;
	artist: {
		id: string;
		name: string;
		'sort-name'?: string;
		disambiguation?: string;
	};
	attributes?: string[];
	'attribute-ids'?: Record<string, string>;
	'attribute-values'?: Record<string, string>;
	target?: string;
	'target-type'?: string;
	begin?: string;
	end?: string;
	ended?: boolean;
}

/** Minimum interval between MB API requests in milliseconds. */
const MB_RATE_LIMIT_MS = 1000;

let lastRequestTime = 0;

/**
 * Rate-limited fetch that enforces 1 req/sec to MusicBrainz API.
 * Respects the MB API requirement for at least 1 second between requests.
 */
export async function rateLimitedFetch(url: string): Promise<Response> {
	const now = Date.now();
	const elapsed = now - lastRequestTime;
	if (elapsed < MB_RATE_LIMIT_MS) {
		await new Promise((resolve) => setTimeout(resolve, MB_RATE_LIMIT_MS - elapsed));
	}
	lastRequestTime = Date.now();
	const response = await fetch(url, {
		headers: {
			'User-Agent': 'mirmir/0.1 (https://github.com/djdembeck/mirmir)',
			Accept: 'application/json',
		},
	});
	return response;
}

/** Resets the rate limiter state (useful for testing). */
export function resetRateLimiter(): void {
	lastRequestTime = 0;
}

const MB_API_BASE = 'https://musicbrainz.org/ws/2';

/**
 * Constructs the MB API URL for fetching a recording with artist relationships.
 * @param mbid - MusicBrainz recording ID (UUID)
 * @returns Full API URL string
 */
export function buildRecordingUrl(mbid: string): string {
	return `${MB_API_BASE}/recording/${mbid}?inc=artist-rels&fmt=json`;
}

/**
 * Converts an MB artist relationship to a TrackCredit.
 * @param relation - MB API artist-recording relationship
 * @returns TrackCredit with MB-sourced data
 */
export function relationToTrackCredit(relation: MBArtistRelation): TrackCredit {
	const { artist, type } = relation;
	const role = normalizeRole(type);

	return {
		name: artist.name,
		role,
		sources: ['MusicBrainz'],
		mbid: artist.id,
		externalIds: [{
			provider: 'musicbrainz',
			type: 'artist',
			id: artist.id,
		} satisfies ExternalEntityId],
	};
}

/**
 * Converts all artist-recording relationships from an MB recording response
 * into an array of TrackCredit objects.
 * @param response - MB API recording response with relations
 * @returns Array of TrackCredit objects
 */
export function recordingResponseToCredits(response: MBRecordingResponse): TrackCredit[] {
	if (!response.relations?.length) {
		return [];
	}

	return response.relations.map((rel) => relationToTrackCredit(rel));
}

/**
 * Fetches existing artist-recording relationships from MusicBrainz for a single recording.
 *
 * Uses the MB API endpoint: GET /ws/2/recording/{mbid}?inc=artist-rels&fmt=json
 * Rate limited to 1 request per second.
 *
 * @param mbid - MusicBrainz recording ID (UUID)
 * @returns Array of TrackCredit objects from MB relationships
 */
export async function fetchRecordingCredits(mbid: string): Promise<TrackCredit[]> {
	const url = buildRecordingUrl(mbid);
	const response = await rateLimitedFetch(url);

	if (!response.ok) {
		await response.body?.cancel();
		if (response.status === 404 || response.status === 400) {
			return [];
		}
		throw new Error(`MusicBrainz API error: ${response.status} ${response.statusText} for recording ${mbid}`);
	}

	const data: MBRecordingResponse = await response.json();
	return recordingResponseToCredits(data);
}

/**
 * Fetches credits for all recordings in a release, respecting MB rate limits.
 *
 * Iterates through recording MBIDs sequentially with 1 req/sec rate limiting.
 * Returns a Map from recording MBID to its TrackCredit array.
 *
 * @param recordingMbids - Array of MusicBrainz recording IDs
 * @returns Map from recording MBID to array of TrackCredit objects
 */
export async function fetchReleaseCredits(
	recordingMbids: string[],
): Promise<Map<string, TrackCredit[]>> {
	const credits = new Map<string, TrackCredit[]>();

	for (const mbid of recordingMbids) {
		const trackCredits = await fetchRecordingCredits(mbid);
		credits.set(mbid, trackCredits);
	}

	return credits;
}
