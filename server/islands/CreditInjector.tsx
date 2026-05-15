import { Button } from '@/server/components/Button.tsx';
import { SpriteIcon } from '@/server/components/SpriteIcon.tsx';
import { CreditView } from '@/server/islands/CreditView.tsx';
import { CreditSelector, getCreditKey, isCreditInjectable, type SelectableCredit } from '@/server/islands/CreditSelector.tsx';
import { InjectionFlow } from '@/server/islands/InjectionFlow.tsx';

import { useCallback, useState } from 'preact/hooks';

import type { TrackCredit } from '@/harmonizer/types.ts';

export type CreditInjectorTrack = {
	number: number | string;
	title: string;
	credits?: TrackCredit[];
	recordingMbid?: string;
};

export type CreditInjectorProps = {
	tracks: CreditInjectorTrack[];
};

function toSelectableCredits(tracks: CreditInjectorTrack[]): SelectableCredit[] {
	const result: SelectableCredit[] = [];
	for (const track of tracks) {
		for (const credit of track.credits ?? []) {
			result.push({
				...credit,
				trackNumber: track.number,
				trackTitle: track.title,
				recordingMbid: track.recordingMbid,
			});
		}
	}
	return result;
}

export function CreditInjector({ tracks }: CreditInjectorProps) {
	const [mode, setMode] = useState<'view' | 'select'>('view');
	const [selectedCredits, setSelectedCredits] = useState<Set<string>>(new Set());

	const selectableCredits = toSelectableCredits(tracks);
	const hasInjectableCredits = selectableCredits.some((c) => isCreditInjectable(c).injectable);

	const handleSelectionChange = useCallback((selected: Set<string>) => {
		setSelectedCredits(selected);
	}, []);

	const handleInjectComplete = useCallback(() => {
		setSelectedCredits(new Set());
		setMode('view');
	}, []);

	const selectedCreditObjects = selectableCredits.filter((c) => selectedCredits.has(getCreditKey(c)));

	return (
		<div class='credit-injector'>
			<div class='credit-injector-header'>
				<h3>Credits</h3>
				{hasInjectableCredits && (
					<div class='credit-injector-mode-toggle'>
						{mode === 'view' ? (
							<Button onClick={() => setMode('select')}>
								<SpriteIcon name='checklist' size={16} />
								Select for MB Injection
							</Button>
						) : (
							<Button onClick={() => setMode('view')}>
								<SpriteIcon name='eye' size={16} />
								View Only
							</Button>
						)}
					</div>
				)}
			</div>

			{mode === 'view' && (
				<CreditView
					tracks={tracks}
					selectionMode={false}
				/>
			)}

			{mode === 'select' && (
				<div class='credit-injector-selection'>
					<div class='credit-injector-warning message warning'>
						<SpriteIcon name='alert-triangle' size={20} />
						<p>
							<strong>MusicBrainz Editing Warning:</strong> You are about to submit data to MusicBrainz.
							All edits are subject to community review. Please verify your selections carefully.
							Injections target <strong>test.musicbrainz.org</strong> by default.
						</p>
					</div>

					<CreditSelector
						credits={selectableCredits}
						selectedCredits={selectedCredits}
						onSelectionChange={handleSelectionChange}
					/>

					{selectedCredits.size > 0 && (
						<div class='credit-injector-flow'>
							<h4>Injection Flow</h4>
							<InjectionFlow
								selectedCredits={selectedCreditObjects}
								onInjectComplete={handleInjectComplete}
							/>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
