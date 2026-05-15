import type { TrackCredit } from '@/harmonizer/types.ts';
import { mapRole, splitCompoundRoles } from '@/mirmir/role_mapping.ts';
import type { Artist, Track } from './api_types.ts';

/**
 * Parse a Discogs track range string into indices of matching tracks.
 * Handles: "1, 3-5, 7" and vinyl "A1-A3" → match against track positions.
 * @returns 0-based indices into trackPositions
 */
export function parseTrackRange(tracksStr: string, trackPositions: string[]): number[] {
	const parts = tracksStr.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
	const matchedIndices = new Set<number>();

	for (const part of parts) {
		const rangeMatch = part.match(/^(.+?)-(.+)$/);
		if (rangeMatch) {
			const [, startStr, endStr] = rangeMatch;
			const startNum = Number(startStr);
			const endNum = Number(endStr);

			if (!isNaN(startNum) && !isNaN(endNum)) {
				for (let n = startNum; n <= endNum; n++) {
					const idx = trackPositions.findIndex((pos) => pos === String(n));
					if (idx !== -1) matchedIndices.add(idx);
				}
			} else {
				const vinylStart = startStr.match(/^([A-Za-z]+)(\d+)$/);
				const vinylEnd = endStr.match(/^([A-Za-z]+)(\d+)$/);
				if (vinylStart && vinylEnd && vinylStart[1] === vinylEnd[1]) {
					const prefix = vinylStart[1];
					const from = parseInt(vinylStart[2], 10);
					const to = parseInt(vinylEnd[2], 10);
					for (let n = from; n <= to; n++) {
						const idx = trackPositions.findIndex((p) => p === `${prefix}${n}`);
						if (idx !== -1) matchedIndices.add(idx);
					}
				} else {
					for (const pos of [startStr, endStr]) {
						const idx = trackPositions.findIndex((p) => p === pos);
						if (idx !== -1) matchedIndices.add(idx);
					}
				}
			}
		} else {
			const idx = trackPositions.findIndex((pos) => pos === part);
			if (idx !== -1) matchedIndices.add(idx);
		}
	}

	return Array.from(matchedIndices).sort((a, b) => a - b);
}

/** Convert a Discogs extraartist to TrackCredit(s), splitting compound roles. */
export function convertExtraartistToCredits(artist: Artist): TrackCredit[] {
	const roles = splitCompoundRoles(artist.role);
	if (roles.length === 0) return [];

	return roles.map((roleStr) => {
		const mapping = mapRole(roleStr, 'Discogs');
		return {
			name: artist.name,
			role: mapping.mbRelationshipType,
			sources: ['Discogs'],
			creditedName: artist.anv || undefined,
			originalRole: roleStr,
			externalIds: [{
				provider: 'discogs',
				type: 'artist',
				id: String(artist.id),
			}],
		};
	});
}

export function extractTrackLevelCredits(track: Track): TrackCredit[] {
	if (!track.extraartists?.length) return [];
	return track.extraartists.flatMap(convertExtraartistToCredits);
}

/**
 * Distribute release-level extraartists to tracks based on their `tracks` field.
 * Empty `tracks` → credit applies to ALL tracks (release-wide).
 */
export function buildReleaseLevelCreditMap(
	extraartists: Artist[] | undefined,
	trackPositions: string[],
): Map<string, TrackCredit[]> {
	const creditMap = new Map<string, TrackCredit[]>();
	if (!extraartists?.length || trackPositions.length === 0) return creditMap;

	for (const artist of extraartists) {
		if (!artist.role) continue;
		const credits = convertExtraartistToCredits(artist);
		if (credits.length === 0) continue;

		const targetPositions = artist.tracks
			? parseTrackRange(artist.tracks, trackPositions).map((idx) => trackPositions[idx])
			: trackPositions;

		for (const pos of targetPositions) {
			const existing = creditMap.get(pos) ?? [];
			creditMap.set(pos, [...existing, ...credits]);
		}
	}

	return creditMap;
}
