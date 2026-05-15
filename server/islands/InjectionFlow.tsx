import { Button } from '@/server/components/Button.tsx';
import { SpriteIcon } from '@/server/components/SpriteIcon.tsx';
import { getCreditKey, type SelectableCredit } from '@/server/islands/CreditSelector.tsx';

import { useCallback, useState } from 'preact/hooks';

import type { DryRunResult, InjectionResult } from '@/mirmir/mb_injector.ts';

type FlowStep = 'review' | 'dryrun' | 'confirm' | 'progress' | 'results';

interface InjectionFlowProps {
	selectedCredits: SelectableCredit[];
	onInjectComplete: () => void;
}

interface ApiResponse {
	success: boolean;
	dryRun?: boolean;
	result?: DryRunResult | InjectionResult;
	error?: string;
}

function StepIndicator({ currentStep }: { currentStep: FlowStep }) {
	const steps: { key: FlowStep; label: string }[] = [
		{ key: 'review', label: 'Review' },
		{ key: 'dryrun', label: 'Dry Run' },
		{ key: 'confirm', label: 'Confirm' },
		{ key: 'progress', label: 'Inject' },
		{ key: 'results', label: 'Results' },
	];

	const currentIndex = steps.findIndex((s) => s.key === currentStep);

	return (
		<div class='injection-step-indicator'>
			{steps.map((step, index) => (
				<div
					key={step.key}
					class={`step-item ${index === currentIndex ? 'active' : ''} ${index < currentIndex ? 'completed' : ''}`}
				>
					<span class='step-number'>{index + 1}</span>
					<span class='step-label'>{step.label}</span>
				</div>
			))}
		</div>
	);
}

function ReviewStep({
	credits,
	onDryRun,
}: {
	credits: SelectableCredit[];
	onDryRun: () => void;
}) {
	const groupedByTrack = credits.reduce((map, credit) => {
		const key = `${credit.trackNumber}. ${credit.trackTitle}`;
		const list = map.get(key) ?? [];
		list.push(credit);
		map.set(key, list);
		return map;
	}, new Map<string, SelectableCredit[]>());

	return (
		<div class='injection-step'>
			<h4>Selected Credits ({credits.length})</h4>
			<div class='injection-review-list'>
				{[...groupedByTrack.entries()].map(([trackKey, trackCredits]) => (
					<div class='injection-review-track' key={trackKey}>
						<h5>{trackKey}</h5>
						<ul>
							{trackCredits.map((credit) => (
								<li key={getCreditKey(credit)}>
									{credit.creditedName ?? credit.name} — {credit.role}
									{credit.mbid && (
										<a
											href={`https://musicbrainz.org/artist/${credit.mbid}`}
											target='_blank'
											rel='noopener noreferrer'
											class='mbid-link'
										>
											<SpriteIcon name='external-link' size={12} />
										</a>
									)}
								</li>
							))}
						</ul>
					</div>
				))}
			</div>
			<div class='injection-step-actions'>
				<Button onClick={onDryRun} class='injection-primary-btn'>
					<SpriteIcon name='test-pipe' size={16} />
					Run Dry Run
				</Button>
			</div>
		</div>
	);
}

function DryRunStep({
	result,
	onConfirm,
	onBack,
}: {
	result: DryRunResult;
	onConfirm: () => void;
	onBack: () => void;
}) {
	return (
		<div class='injection-step'>
			<h4>Dry Run Results</h4>
			<div class='injection-dryrun-summary'>
				<div class='dryrun-stat success'>
					<SpriteIcon name='check' size={20} />
					<span>{result.wouldSubmit} would be submitted</span>
				</div>
				<div class='dryrun-stat warning'>
					<SpriteIcon name='skip-forward' size={20} />
					<span>{result.wouldSkip} would be skipped</span>
				</div>
			</div>
			<div class='injection-dryrun-details'>
				{result.details.map((detail, index) => (
					<div
						key={index}
						class={`dryrun-detail ${detail.startsWith('---') ? 'detail-header' : ''} ${
							detail.startsWith('Skipped') ? 'detail-skip' : ''
						}`}
					>
						{detail}
					</div>
				))}
			</div>
			<div class='injection-step-actions'>
				<Button onClick={onBack}>
					<SpriteIcon name='arrow-left' size={14} />
					Back
				</Button>
				<Button onClick={onConfirm} class='injection-primary-btn'>
					<SpriteIcon name='rocket' size={16} />
					Proceed to Injection
				</Button>
			</div>
		</div>
	);
}

function ConfirmStep({
	creditCount,
	onInject,
	onCancel,
}: {
	creditCount: number;
	onInject: () => void;
	onCancel: () => void;
}) {
	return (
		<div class='injection-step'>
			<div class='injection-confirm-dialog'>
				<div class='confirm-warning'>
					<SpriteIcon name='alert-triangle' size={32} />
					<h4>You are about to edit MusicBrainz</h4>
					<p>All edits are subject to community review.</p>
					<p>
						You are submitting <strong>{creditCount}</strong> artist-recording relationship
						{creditCount === 1 ? '' : 's'}.
					</p>
					<p class='confirm-target'>Target: test.musicbrainz.org (sandbox)</p>
				</div>
				<div class='injection-step-actions'>
					<Button onClick={onCancel}>
						<SpriteIcon name='x' size={14} />
						Cancel
					</Button>
					<Button onClick={onInject} class='injection-danger-btn'>
						<SpriteIcon name='check' size={14} />
						Confirm Injection
					</Button>
				</div>
			</div>
		</div>
	);
}

function ProgressStep({ current, total }: { current: number; total: number }) {
	const percent = total > 0 ? Math.round((current / total) * 100) : 0;
	return (
		<div class='injection-step injection-progress'>
			<div class='spinning'>
				<SpriteIcon name='loader' size={32} />
			</div>
			<h4>Injecting credits...</h4>
			<div class='progress-bar-container'>
				<div class='progress-bar' style={{ width: `${percent}%` }} />
			</div>
			<p>
				{current} of {total} credits processed
			</p>
		</div>
	);
}

function ResultsStep({
	result,
	onDone,
}: {
	result: InjectionResult;
	onDone: () => void;
}) {
	const hasErrors = result.errors.length > 0;
	const hasEdits = result.editUrls.length > 0;

	return (
		<div class='injection-step'>
			<h4>Injection Results</h4>
			<div class='injection-results-summary'>
				<div class='result-stat success'>
					<SpriteIcon name='check' size={20} />
					<span>{result.submitted} submitted</span>
				</div>
				<div class='result-stat warning'>
					<SpriteIcon name='skip-forward' size={20} />
					<span>{result.skipped} skipped</span>
				</div>
				{hasErrors && (
					<div class='result-stat error'>
						<SpriteIcon name='x' size={20} />
						<span>{result.errors.length} error{result.errors.length === 1 ? '' : 's'}</span>
					</div>
				)}
			</div>

			{hasErrors && (
				<div class='injection-results-errors'>
					<h5>Errors</h5>
					<ul>
						{result.errors.map((err, index) => (
							<li key={index} class='error-item'>
								<SpriteIcon name='x' size={14} />
								{err}
							</li>
						))}
					</ul>
				</div>
			)}

			{hasEdits && (
				<div class='injection-results-edits'>
					<h5>Edit URLs</h5>
					<ul>
						{result.editUrls.map((url, index) => (
							<li key={index}>
								<a href={url} target='_blank' rel='noopener noreferrer'>
									<SpriteIcon name='external-link' size={12} />
									{url}
								</a>
							</li>
						))}
					</ul>
				</div>
			)}

			<div class='injection-step-actions'>
				<Button onClick={onDone}>
					<SpriteIcon name='check' size={14} />
					Done
				</Button>
			</div>
		</div>
	);
}

export function InjectionFlow({ selectedCredits, onInjectComplete }: InjectionFlowProps) {
	const [step, setStep] = useState<FlowStep>('review');
	const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
	const [injectionResult, setInjectionResult] = useState<InjectionResult | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [progress, setProgress] = useState({ current: 0, total: 0 });

	const runDryRun = useCallback(async () => {
		setError(null);
		setStep('dryrun');

		const recordingMbids = [...new Set(selectedCredits.map((c) => c.recordingMbid).filter(Boolean))];
		if (recordingMbids.length === 0) {
			setError('No recording MBIDs found for selected credits.');
			return;
		}

		const allDetails: string[] = [];
		let totalWouldSubmit = 0;
		let totalWouldSkip = 0;

		for (const recordingMbid of recordingMbids) {
			const trackCredits = selectedCredits.filter((c) => c.recordingMbid === recordingMbid);
			try {
				const response = await fetch('/api/inject', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ recordingMbid, credits: trackCredits, dryRun: true }),
				});
				const data = await response.json() as ApiResponse;
				if (!data.success || !data.result) {
					allDetails.push(`--- Recording ${recordingMbid} ---`);
					allDetails.push(`Error: ${data.error ?? 'Unknown error'}`);
					continue;
				}
				const result = data.result as DryRunResult;
				allDetails.push(`--- Recording ${recordingMbid} ---`);
				allDetails.push(...result.details);
				totalWouldSubmit += result.wouldSubmit;
				totalWouldSkip += result.wouldSkip;
			} catch (err) {
				allDetails.push(`--- Recording ${recordingMbid} ---`);
				allDetails.push(`Error: ${err instanceof Error ? err.message : String(err)}`);
			}
		}

		setDryRunResult({
			wouldSubmit: totalWouldSubmit,
			wouldSkip: totalWouldSkip,
			details: allDetails,
		});
	}, [selectedCredits]);

	const runInjection = useCallback(async () => {
		setError(null);
		setStep('progress');

		const recordingMbids = [...new Set(selectedCredits.map((c) => c.recordingMbid).filter(Boolean))];
		setProgress({ current: 0, total: recordingMbids.length });

		const combinedResult: InjectionResult = {
			submitted: 0,
			skipped: 0,
			errors: [],
			editUrls: [],
		};

		for (let i = 0; i < recordingMbids.length; i++) {
			const recordingMbid = recordingMbids[i];
			const trackCredits = selectedCredits.filter((c) => c.recordingMbid === recordingMbid);
			setProgress({ current: i, total: recordingMbids.length });

			try {
				const response = await fetch('/api/inject', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ recordingMbid, credits: trackCredits, dryRun: false }),
				});
				const data = await response.json() as ApiResponse;
				if (!data.success || !data.result) {
					combinedResult.errors.push(`Recording ${recordingMbid}: ${data.error ?? 'Unknown error'}`);
					continue;
				}
				const result = data.result as InjectionResult;
				combinedResult.submitted += result.submitted;
				combinedResult.skipped += result.skipped;
				combinedResult.errors.push(...result.errors);
				combinedResult.editUrls.push(...result.editUrls);
			} catch (err) {
				combinedResult.errors.push(
					`Recording ${recordingMbid}: ${err instanceof Error ? err.message : String(err)}`,
				);
			}
		}

		setProgress({ current: recordingMbids.length, total: recordingMbids.length });
		setInjectionResult(combinedResult);
		setStep('results');
	}, [selectedCredits]);

	if (selectedCredits.length === 0) {
		return (
			<div class='injection-flow-empty'>
				<SpriteIcon name='circle-dashed' size={24} />
				<p>Select credits above to begin the injection flow.</p>
			</div>
		);
	}

	return (
		<div class='injection-flow'>
			<StepIndicator currentStep={step} />

			{error && (
				<div class='message error'>
					<SpriteIcon name='alert-triangle' size={20} />
					<p>{error}</p>
				</div>
			)}

			{step === 'review' && <ReviewStep credits={selectedCredits} onDryRun={runDryRun} />}

			{step === 'dryrun' && dryRunResult && (
				<DryRunStep
					result={dryRunResult}
					onConfirm={() => setStep('confirm')}
					onBack={() => setStep('review')}
				/>
			)}

			{step === 'confirm' && (
				<ConfirmStep
					creditCount={selectedCredits.length}
					onInject={runInjection}
					onCancel={() => setStep('dryrun')}
				/>
			)}

			{step === 'progress' && <ProgressStep current={progress.current} total={progress.total} />}

			{step === 'results' && injectionResult && (
				<ResultsStep
					result={injectionResult}
					onDone={() => {
						onInjectComplete();
						setStep('review');
						setDryRunResult(null);
						setInjectionResult(null);
					}}
				/>
			)}
		</div>
	);
}
