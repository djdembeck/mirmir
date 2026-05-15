import { Button } from '@/server/components/Button.tsx';
import { SpriteIcon } from '@/server/components/SpriteIcon.tsx';


import { useSignal } from '@preact/signals';
import { useCallback } from 'preact/hooks';

import type { TrackCredit } from '@/harmonizer/types.ts';

export type CreditViewTrack = {
	number: number | string;
	title: string;
	credits?: TrackCredit[];
	recordingMbid?: string;
};

export type CreditViewProps = {
	tracks: CreditViewTrack[];
	selectionMode?: boolean;
	selectedCredits?: Set<string>;
	onCreditToggle?: (key: string) => void;
	getCreditKey?: (credit: TrackCredit, trackNumber: number | string) => string;
	isCreditDisabled?: (credit: TrackCredit) => { disabled: boolean; reason?: string };
};

const sourceColorMap: Record<string, string> = {
	Tidal: 'var(--tidal)',
	Discogs: 'var(--discogs)',
	MusicBrainz: 'var(--musicbrainz)',
};

function sourceBadgeColor(source: string): string {
	return sourceColorMap[source] ?? 'var(--badge-fill)';
}

function groupCreditsByRole(credits: TrackCredit[]): Map<string, TrackCredit[]> {
	const groups = new Map<string, TrackCredit[]>();
	for (const credit of credits) {
		const list = groups.get(credit.role);
		if (list) {
			list.push(credit);
		} else {
			groups.set(credit.role, [credit]);
		}
	}
	return groups;
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

function CreditEntry({
	credit,
	trackNumber,
	selectionMode,
	isSelected,
	onToggle,
	isDisabled,
	disableReason,
	getCreditKey,
}: {
	credit: TrackCredit;
	trackNumber: number | string;
	selectionMode?: boolean;
	isSelected?: boolean;
	onToggle?: (key: string) => void;
	isDisabled?: boolean;
	disableReason?: string;
	getCreditKey?: (credit: TrackCredit, trackNumber: number | string) => string;
}) {
	const displayName = credit.creditedName ?? credit.name;
	const key = getCreditKey ? getCreditKey(credit, trackNumber) : `${trackNumber}::${credit.name}::${credit.role}`;

	return (
		<div class={`credit-entry ${selectionMode ? 'selectable' : ''}`}>
			{selectionMode && (
				<input
					type='checkbox'
					checked={isSelected}
					disabled={isDisabled}
					onChange={() => onToggle?.(key)}
					class='credit-select-checkbox'
					title={disableReason ?? 'Select for injection'}
				/>
			)}
			<span class='credit-name' title='Click to select'>{displayName}</span>
			{credit.sources.map((source) => <SourceBadge source={source} key={source} />)}
			{credit.originalRole && credit.originalRole !== credit.role && (
				<span class='credit-original-role'>({credit.originalRole})</span>
			)}
			{selectionMode && isDisabled && disableReason && (
				<span class='credit-skip-reason'>
					<SpriteIcon name='info-circle' size={12} />
					{disableReason}
				</span>
			)}
		</div>
	);
}

function TrackCreditCard({
	track,
	selectionMode,
	selectedCredits,
	onCreditToggle,
	getCreditKey,
	isCreditDisabled,
}: {
	track: CreditViewTrack;
	selectionMode?: boolean;
	selectedCredits?: Set<string>;
	onCreditToggle?: (key: string) => void;
	getCreditKey?: (credit: TrackCredit, trackNumber: number | string) => string;
	isCreditDisabled?: (credit: TrackCredit) => { disabled: boolean; reason?: string };
}) {
	const credits = track.credits ?? [];
	const grouped = groupCreditsByRole(credits);
	const sortedRoles = [...grouped.keys()].sort();

	return (
		<div class='track-credit-card'>
			<div class='track-credit-header'>
				<span class='track-number'>{track.number}</span>
				<span class='track-title'>{track.title}</span>
			</div>
			<div class='track-credit-body'>
				{sortedRoles.map((role) => (
					<div class='role-group' key={role}>
						<h4 class='role-name'>{role}</h4>
						<div class='role-credits'>
							{grouped.get(role)!.map((credit, index) => {
								const key = getCreditKey
									? getCreditKey(credit, track.number)
									: `${track.number}::${credit.name}::${credit.role}`;
								const disabledInfo = isCreditDisabled ? isCreditDisabled(credit) : { disabled: false };
								return (
									<CreditEntry
										credit={credit}
										trackNumber={track.number}
										selectionMode={selectionMode}
										isSelected={selectedCredits?.has(key)}
										onToggle={onCreditToggle}
										isDisabled={disabledInfo.disabled}
										disableReason={disabledInfo.reason}
										getCreditKey={getCreditKey}
										key={index}
									/>
								);
							})}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

export function CreditView({
	tracks,
	selectionMode,
	selectedCredits,
	onCreditToggle,
	getCreditKey,
	isCreditDisabled,
}: CreditViewProps) {
	const isLoading = useSignal(false);
	const mbCredits = useSignal<Map<string, TrackCredit[]>>(new Map());
	const error = useSignal<string | null>(null);

	const tracksWithCredits = tracks.filter((t) => (t.credits?.length ?? 0) > 0);
	const hasAnyCredits = tracksWithCredits.length > 0;

	const tracksWithMbids = tracks.filter((t) => t.recordingMbid);
	const canFetchMb = tracksWithMbids.length > 0;

	const handleFetchMbCredits = useCallback(async () => {
		isLoading.value = true;
		error.value = null;
		const results = new Map<string, TrackCredit[]>();

		try {
			const mbids = tracksWithMbids
				.map((t) => t.recordingMbid)
				.filter((m): m is string => !!m);
			const response = await fetch('/api/mb-credits', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ recordingMbids: mbids }),
			});
			if (!response.ok) {
				const errBody = await response.json().catch(() => ({ error: response.statusText }));
				throw new Error(errBody.error ?? `HTTP ${response.status}`);
			}
			const data = await response.json() as Record<string, TrackCredit[]>;
			for (const [mbid, credits] of Object.entries(data)) {
				results.set(mbid, credits);
			}
			mbCredits.value = results;
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to fetch MusicBrainz credits';
			isLoading.value = false;
		}
	}, [tracksWithMbids]);

	const getMergedCredits = useCallback((track: CreditViewTrack): TrackCredit[] => {
		const existing = track.credits ?? [];
		if (!track.recordingMbid) return existing;

		const fetched = mbCredits.value.get(track.recordingMbid);
		if (!fetched || fetched.length === 0) return existing;

		const merged = [...existing];
		for (const mbCredit of fetched) {
			const isDuplicate = existing.some(
				(c) => c.name === mbCredit.name && c.role === mbCredit.role,
			);
			if (!isDuplicate) {
				merged.push(mbCredit);
			}
		}
		return merged;
	}, [mbCredits.value]);

	return (
		<div class='credit-view'>
			<div class='credit-view-header'>
				<h3>Credits</h3>
				{canFetchMb && (
					<Button
						onClick={handleFetchMbCredits}
						disabled={isLoading.value}
						title='Fetch existing credits from MusicBrainz for tracks with recording MBIDs'
					>
						{isLoading.value ? (
							<>
								<SpriteIcon name='disc' size={16} />
								Loading...
							</>
						) : (
							<>
								<SpriteIcon name='database-import' size={16} />
								Check existing MB credits
							</>
						)}
					</Button>
				)}
			</div>

			{error.value && (
				<div class='message error'>
					<SpriteIcon name='alert-triangle' size={20} />
					<p>{error.value}</p>
				</div>
			)}

			{!hasAnyCredits && mbCredits.value.size === 0 && (
				<p class='credit-empty'>No credits found for this release.</p>
			)}

			<div class='credit-track-grid'>
				{tracks.map((track) => {
					const mergedCredits = getMergedCredits(track);
					const hasCredits = mergedCredits.length > 0;
					if (!hasCredits) return null;

					return (
						<TrackCreditCard
							track={{ ...track, credits: mergedCredits }}
							selectionMode={selectionMode}
							selectedCredits={selectedCredits}
							onCreditToggle={onCreditToggle}
							getCreditKey={getCreditKey}
							isCreditDisabled={isCreditDisabled}
							key={track.number}
						/>
					);
				})}
			</div>
		</div>
	);
}
