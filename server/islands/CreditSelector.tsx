import { Button } from '@/server/components/Button.tsx';
import { SpriteIcon } from '@/server/components/SpriteIcon.tsx';
import { isWorkLevelRole } from '@/mirmir/role_mapping.ts';

import { useCallback } from 'preact/hooks';

import type { TrackCredit } from '@/harmonizer/types.ts';

export type SelectableCredit = TrackCredit & {
	trackNumber: number | string;
	trackTitle: string;
	recordingMbid?: string;
};

export type CreditSelectorProps = {
	credits: SelectableCredit[];
	selectedCredits: Set<string>;
	onSelectionChange: (selected: Set<string>) => void;
};

export function getCreditKey(credit: SelectableCredit): string {
	return `${credit.trackNumber}::${credit.name}::${credit.role}`;
}

export function isCreditInjectable(credit: SelectableCredit): { injectable: boolean; reason?: string } {
	if (isWorkLevelRole(credit.role) || isWorkLevelRole(credit.originalRole ?? '')) {
		return { injectable: false, reason: 'Work-level relationship — skip for v1' };
	}
	if (!credit.mbid) {
		return { injectable: false, reason: 'No artist MBID' };
	}
	return { injectable: true };
}

function groupCreditsByRole(credits: SelectableCredit[]): Map<string, SelectableCredit[]> {
	const groups = new Map<string, SelectableCredit[]>();
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

function CreditCheckbox({
	credit,
	isSelected,
	onToggle,
}: {
	credit: SelectableCredit;
	isSelected: boolean;
	onToggle: (key: string) => void;
}) {
	const { injectable, reason } = isCreditInjectable(credit);
	const key = getCreditKey(credit);
	const displayName = credit.creditedName ?? credit.name;

	return (
		<label
			class={`credit-checkbox-label ${!injectable ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}
			title={reason ?? 'Click to select for injection'}
		>
			<input
				type='checkbox'
				checked={isSelected}
				disabled={!injectable}
				onChange={() => onToggle(key)}
			/>
			<span class='credit-checkbox-name'>{displayName}</span>
			{credit.originalRole && credit.originalRole !== credit.role && (
				<span class='credit-original-role'>({credit.originalRole})</span>
			)}
			{!injectable && reason && (
				<span class='credit-skip-reason'>
					<SpriteIcon name='info-circle' size={12} />
					{reason}
				</span>
			)}
		</label>
	);
}

export function CreditSelector({ credits, selectedCredits, onSelectionChange }: CreditSelectorProps) {
	const grouped = groupCreditsByRole(credits);
	const sortedRoles = [...grouped.keys()].sort();

	const handleToggle = useCallback((key: string) => {
		const newSelected = new Set(selectedCredits);
		if (newSelected.has(key)) {
			newSelected.delete(key);
		} else {
			newSelected.add(key);
		}
		onSelectionChange(newSelected);
	}, [selectedCredits, onSelectionChange]);

	const handleSelectAllInRole = useCallback((role: string, select: boolean) => {
		const roleCredits = grouped.get(role) ?? [];
		const selectable = roleCredits.filter((c) => isCreditInjectable(c).injectable);
		const newSelected = new Set(selectedCredits);

		for (const credit of selectable) {
			const key = getCreditKey(credit);
			if (select) {
				newSelected.add(key);
			} else {
				newSelected.delete(key);
			}
		}
		onSelectionChange(newSelected);
	}, [grouped, selectedCredits, onSelectionChange]);

	const handleSelectAll = useCallback(() => {
		const newSelected = new Set<string>();
		for (const credit of credits) {
			if (isCreditInjectable(credit).injectable) {
				newSelected.add(getCreditKey(credit));
			}
		}
		onSelectionChange(newSelected);
	}, [credits, onSelectionChange]);

	const handleDeselectAll = useCallback(() => {
		onSelectionChange(new Set());
	}, [onSelectionChange]);

	const totalSelectable = credits.filter((c) => isCreditInjectable(c).injectable).length;
	const totalSelected = selectedCredits.size;

	return (
		<div class='credit-selector'>
			<div class='credit-selector-header'>
				<div class='credit-selector-stats'>
					<SpriteIcon name='checklist' size={18} />
					<span>{totalSelected} of {totalSelectable} selected</span>
				</div>
				<div class='credit-selector-actions'>
					<Button onClick={handleSelectAll} disabled={totalSelected === totalSelectable}>
						<SpriteIcon name='checks' size={14} />
						Select All
					</Button>
					<Button onClick={handleDeselectAll} disabled={totalSelected === 0}>
						<SpriteIcon name='square' size={14} />
						Deselect All
					</Button>
				</div>
			</div>

			<div class='credit-selector-roles'>
				{sortedRoles.map((role) => {
					const roleCredits = grouped.get(role)!;
					const selectable = roleCredits.filter((c) => isCreditInjectable(c).injectable);
					const selectableKeys = selectable.map(getCreditKey);
					const selectedInRole = selectableKeys.filter((k) => selectedCredits.has(k));
					const allSelected = selectableKeys.length > 0 && selectedInRole.length === selectableKeys.length;
					const someSelected = selectedInRole.length > 0 && !allSelected;

					return (
						<div class='credit-role-group' key={role}>
							<div class='credit-role-header'>
								<h4 class='role-name'>{role}</h4>
								{selectable.length > 0 && (
									<label class='role-select-all'>
										<input
											type='checkbox'
											checked={allSelected}
											ref={(el: HTMLInputElement | null) => {
												if (el) el.indeterminate = someSelected;
											}}
											onChange={() => handleSelectAllInRole(role, !allSelected)}
										/>
										<span>Select all {selectable.length}</span>
									</label>
								)}
							</div>
							<div class='credit-role-credits'>
								{roleCredits.map((credit) => (
									<CreditCheckbox
										credit={credit}
										isSelected={selectedCredits.has(getCreditKey(credit))}
										onToggle={handleToggle}
										key={getCreditKey(credit)}
									/>
								))}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
