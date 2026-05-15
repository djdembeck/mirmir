import { SpriteIcon } from '@/server/components/SpriteIcon.tsx';

import { useSignal } from '@preact/signals';

import type { TrackCredit } from '@/harmonizer/types.ts';

export type CommonContributorTrack = {
	number: number | string;
	title: string;
	credits?: TrackCredit[];
};

export type CommonContributorsProps = {
	tracks: CommonContributorTrack[];
};

const sourceColorMap: Record<string, string> = {
	Tidal: 'var(--tidal)',
	Discogs: 'var(--discogs)',
	MusicBrainz: 'var(--musicbrainz)',
};

function sourceBadgeColor(source: string): string {
	return sourceColorMap[source] ?? 'var(--badge-fill)';
}

function SourceBadge({ source }: { source: string }) {
	return (
		<span
			class='source-badge'
			style={{ backgroundColor: sourceBadgeColor(source) }}
			title={source}
		>
			{source}
		</span>
	);
}

function compressTrackRanges(trackNumbers: number[]): string {
	if (trackNumbers.length === 0) return '';
	const sorted = [...trackNumbers].sort((a, b) => a - b);
	const ranges: string[] = [];
	let start = sorted[0];
	let end = sorted[0];
	for (let i = 1; i < sorted.length; i++) {
		if (sorted[i] === end + 1) {
			end = sorted[i];
		} else {
			ranges.push(start === end ? `${start}` : `${start}-${end}`);
			start = sorted[i];
			end = sorted[i];
		}
	}
	ranges.push(start === end ? `${start}` : `${start}-${end}`);
	return ranges.join(', ');
}

function parseTrackNumber(num: number | string): number | null {
	if (typeof num === 'number') return num;
	const parsed = parseInt(num, 10);
	return isNaN(parsed) ? null : parsed;
}

type ContributorEntry = {
	name: string;
	creditedName?: string;
	trackNumbers: number[];
	sources: string[];
};

function computeCommonContributors(tracks: CommonContributorTrack[]): Map<string, ContributorEntry[]> {
	const contributorMap = new Map<string, {
		name: string;
		creditedName?: string;
		trackNumbers: Set<number>;
		sources: Set<string>;
	}>();

	for (const track of tracks) {
		const trackNum = parseTrackNumber(track.number);
		if (trackNum === null) continue;

		for (const credit of track.credits ?? []) {
			const key = `${credit.name}|${credit.role}`;
			const existing = contributorMap.get(key);
			if (existing) {
				existing.trackNumbers.add(trackNum);
				for (const source of credit.sources) {
					existing.sources.add(source);
				}
			} else {
				const sources = new Set<string>(credit.sources);
				contributorMap.set(key, {
					name: credit.name,
					creditedName: credit.creditedName,
					trackNumbers: new Set([trackNum]),
					sources,
				});
			}
		}
	}

	const roleGroups = new Map<string, ContributorEntry[]>();
	for (const [key, data] of contributorMap) {
		if (data.trackNumbers.size < 2) continue;
		const role = key.split('|')[1];
		const entry: ContributorEntry = {
			name: data.name,
			creditedName: data.creditedName,
			trackNumbers: [...data.trackNumbers].sort((a, b) => a - b),
			sources: [...data.sources].sort(),
		};
		const list = roleGroups.get(role);
		if (list) {
			list.push(entry);
		} else {
			roleGroups.set(role, [entry]);
		}
	}

	for (const [, list] of roleGroups) {
		list.sort((a, b) => a.name.localeCompare(b.name));
	}

	return roleGroups;
}

function ContributorRow({ entry }: { entry: ContributorEntry }) {
	const displayName = entry.creditedName ?? entry.name;
	const rangeStr = compressTrackRanges(entry.trackNumbers);
	return (
		<div class='common-contributor-row'>
			<span class='common-contributor-name' title='Click to select'>{displayName}</span>
			{entry.sources.map((source) => <SourceBadge source={source} key={source} />)}
			<span class='common-contributor-tracks'>tracks {rangeStr}</span>
		</div>
	);
}

export function CommonContributors({ tracks }: CommonContributorsProps) {
	const isExpanded = useSignal(true);
	const roleGroups = computeCommonContributors(tracks);
	const sortedRoles = [...roleGroups.keys()].sort();
	const hasContributors = sortedRoles.length > 0;

	return (
		<div class='common-contributors'>
			<button
				class='common-contributors-toggle'
				onClick={() => { isExpanded.value = !isExpanded.value; }}
				type='button'
			>
				<SpriteIcon
					name={isExpanded.value ? 'chevron-down' : 'chevron-right'}
					size={18}
				/>
				<h3>Common Contributors</h3>
				{hasContributors && (
					<span class='common-contributors-count'>
						{sortedRoles.reduce((sum, role) => sum + (roleGroups.get(role)?.length ?? 0), 0)} contributors
					</span>
				)}
			</button>

			{isExpanded.value && (
				<div class='common-contributors-body'>
					{!hasContributors && (
						<p class='credit-empty'>No common contributors found</p>
					)}
					{sortedRoles.map((role) => (
						<div class='role-group' key={role}>
							<h4 class='role-name'>{role}</h4>
							<div class='role-credits'>
								{roleGroups.get(role)!.map((entry, index) => (
									<ContributorRow entry={entry} key={index} />
								))}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
