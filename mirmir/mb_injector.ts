/**
 * Programmatic MB Relationship Injection via URL Seeding + Form Submission
 *
 * Creates artist-recording relationships on MusicBrainz by POSTing
 * `rels.{N}.*` form fields to the recording edit page.
 *
 * Uses session-based authentication (not the REST API, which does not
 * support relationship creation).
 */

import { mapRole, isWorkLevelRole, type RoleMapping } from './role_mapping.ts';
import type { TrackCredit } from '@/harmonizer/types.ts';

// ── Types ────────────────────────────────────────────────────────────────────

export interface MBInjectorConfig {
	/** Base URL of the MusicBrainz instance (default: https://test.musicbrainz.org) */
	baseUrl?: string;
	/** Bot account username */
	username: string;
	/** Bot account password */
	password: string;
}

export interface InjectionResult {
	/** Number of relationships successfully submitted */
	submitted: number;
	/** Number of credits skipped (work-level, no MBID, unconfirmed) */
	skipped: number;
	/** Error messages for failed submissions */
	errors: string[];
	/** URLs of the edit pages that were submitted */
	editUrls: string[];
}

export interface DryRunResult {
	/** Number of relationships that would be submitted */
	wouldSubmit: number;
	/** Number of credits that would be skipped */
	wouldSkip: number;
	/** Human-readable details of each credit's form fields */
	details: string[];
}

// ── Rate Limiter ────────────────────────────────────────────────────────────

/** Minimum milliseconds between requests (MB guideline: 1 req/sec) */
const MIN_REQUEST_INTERVAL_MS = 1000;

let lastRequestTime = 0;

/** Reset rate limiter state (for test isolation) */
export function resetInjectorRateLimiter(): void {
	lastRequestTime = 0;
}

async function rateLimitedFetch(url: string, init?: RequestInit): Promise<Response> {
	const now = Date.now();
	const elapsed = now - lastRequestTime;
	if (elapsed < MIN_REQUEST_INTERVAL_MS) {
		await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed));
	}
	lastRequestTime = Date.now();
	return globalThis.fetch(url, init);
}

// ── MBInjector Class ────────────────────────────────────────────────────────

export class MBInjector {
	private baseUrl: string;
	private username: string;
	private password: string;
	private sessionCookie: string | null = null;
	private csrfToken: string | null = null;

	constructor(config: MBInjectorConfig) {
		this.baseUrl = config.baseUrl ?? 'https://test.musicbrainz.org';
		this.username = config.username;
		this.password = config.password;
	}

	/**
	 * Authenticate with MusicBrainz via session-based login.
	 * POSTs to /login with username/password, extracts session cookie and CSRF token.
	 */
	async login(): Promise<void> {
		// Step 1: GET the login page to extract CSRF token
		const loginPageUrl = `${this.baseUrl}/login`;
		const pageResponse = await rateLimitedFetch(loginPageUrl);
		const pageHtml = await pageResponse.text();

		// Extract CSRF token from the login form
		const csrfMatch = pageHtml.match(/name="csrf_token"\s+value="([^"]+)"/);
		if (!csrfMatch) {
			throw new Error('Could not extract CSRF token from login page');
		}
		this.csrfToken = csrfMatch[1];

		// Step 2: POST login credentials
		const loginBody = new URLSearchParams({
			csrf_token: this.csrfToken,
			username: this.username,
			password: this.password,
		});

		const loginResponse = await rateLimitedFetch(loginPageUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: loginBody.toString(),
			redirect: 'manual', // Don't follow redirects so we can capture the cookie
		});

		// Extract session cookie from Set-Cookie header
		const setCookie = loginResponse.headers.get('set-cookie');
		if (!setCookie) {
			throw new Error('Login failed: no session cookie returned');
		}

		// Parse the session cookie (MB uses "session" or "musicbrainz_server_session")
		const cookieMatch = setCookie.match(/(session|musicbrainz_server_session)=[^;]+/);
		if (!cookieMatch) {
			throw new Error('Login failed: could not parse session cookie');
		}
		this.sessionCookie = cookieMatch[0];

		// Check for redirect to home page (successful login)
		const location = loginResponse.headers.get('location');
		if (loginResponse.status !== 302 || !location) {
			throw new Error('Login failed: unexpected response status ' + loginResponse.status);
		}
	}

	/**
	 * Inject credits as artist-recording relationships via form submission.
	 * For each credit, constructs `rels.{N}.*` form fields and POSTs to the
	 * recording edit page.
	 */
	async injectCredits(recordingMbid: string, credits: TrackCredit[]): Promise<InjectionResult> {
		if (!this.sessionCookie) {
			throw new Error('Not logged in. Call login() first.');
		}

		const result: InjectionResult = {
			submitted: 0,
			skipped: 0,
			errors: [],
			editUrls: [],
		};

		const { formFields, skipped } = this.buildFormFields(credits);
		result.skipped = skipped;

		if (formFields.length === 0) {
			return result;
		}

		// Build the full form data
		const formData = new URLSearchParams();

		// Add CSRF token
		if (this.csrfToken) {
			formData.append('csrf_token', this.csrfToken);
		}

		// Add relationship form fields
		for (const field of formFields) {
			formData.append(field.name, field.value);
		}

		// Add edit note
		const editNote = this.buildEditNote(credits);
		formData.append('edit_note', editNote);

		// POST to the recording edit page
		const editUrl = `${this.baseUrl}/recording/${recordingMbid}/edit`;

		try {
			const response = await rateLimitedFetch(editUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Cookie: this.sessionCookie,
				},
				body: formData.toString(),
				redirect: 'manual',
			});

			// Consume the body to prevent resource leaks
			await response.body?.cancel();

			if (response.status === 200 || response.status === 302) {
				result.submitted = formFields.filter((f) => /^rels\.\d+\.type$/.test(f.name)).length;
				result.editUrls.push(editUrl);
			} else {
				result.errors.push(`HTTP ${response.status} when posting to ${editUrl}`);
			}
		} catch (error) {
			result.errors.push(`Network error: ${error instanceof Error ? error.message : String(error)}`);
		}

		return result;
	}

	/**
	 * Dry-run mode: logs what would be submitted without making any POST requests.
	 * Returns the same structure as injectCredits but with details instead of editUrls.
	 */
	dryRun(recordingMbid: string, credits: TrackCredit[]): DryRunResult {
		const result: DryRunResult = {
			wouldSubmit: 0,
			wouldSkip: 0,
			details: [],
		};

		const { formFields, skipped, skipReasons } = this.buildFormFields(credits);
		result.wouldSkip = skipped;
		result.wouldSubmit = formFields.filter((f) => /^rels\.\d+\.type$/.test(f.name)).length;

		// Add recording MBID to details
		result.details.push(`Recording: ${recordingMbid}`);

		// Log skip reasons
		for (const reason of skipReasons) {
			result.details.push(reason);
		}

		// Log each relationship's form fields
		let currentRel = -1;
		for (const field of formFields) {
			const relMatch = field.name.match(/^rels\.(\d+)\./);
			if (relMatch) {
				const relIndex = parseInt(relMatch[1]);
				if (relIndex !== currentRel) {
					currentRel = relIndex;
					result.details.push(`--- Relationship ${relIndex} ---`);
				}
				result.details.push(`  ${field.name} = ${field.value}`);
			}
		}

		// Add edit note details
		const editNote = this.buildEditNote(credits);
		result.details.push(`--- Edit Note ---`);
		result.details.push(`  ${editNote}`);

		return result;
	}

	// ── Internal Helpers ──────────────────────────────────────────────────

	/**
	 * Build `rels.{N}.*` form fields from an array of TrackCredits.
	 * Skips work-level credits, credits without MBID, and unconfirmed mappings.
	 */
	private buildFormFields(credits: TrackCredit[]): {
		formFields: Array<{ name: string; value: string }>;
		skipped: number;
		skipReasons: string[];
	} {
		const formFields: Array<{ name: string; value: string }> = [];
		const skipReasons: string[] = [];
		let skipped = 0;
		let relIndex = 0;

		for (const credit of credits) {
			// Determine source for mapRole
			const source = credit.sources.includes('Tidal') ? 'Tidal' as const : 'Discogs' as const;
			const roleToMap = credit.originalRole ?? credit.role;
			const mapping = mapRole(roleToMap, source);

			// Skip work-level credits (Composer, Lyricist, Songwriter)
			if (this.isWorkLevelCredit(credit, mapping)) {
				skipped++;
				skipReasons.push(`Skipped "${credit.name}" (${roleToMap}): work-level relationship`);
				continue;
			}

			// Skip credits without MBID
			if (!credit.mbid) {
				skipped++;
				skipReasons.push(`Skipped "${credit.name}" (${roleToMap}): no artist MBID`);
				continue;
			}

			// Skip credits with unconfirmed mappings (empty UUID)
			if (this.isUnconfirmedMapping(mapping)) {
				skipped++;
				skipReasons.push(`Skipped "${credit.name}" (${roleToMap}): unconfirmed mapping`);
				continue;
			}

			// Build rels.{N}.* form fields
			const n = relIndex;

			// rels.{N}.type — relationship type UUID
			formFields.push({
				name: `rels.${n}.type`,
				value: mapping.mbRelationshipId,
			});

			// rels.{N}.target — target artist MBID
			formFields.push({
				name: `rels.${n}.target`,
				value: credit.mbid,
			});

			// rels.{N}.backward — "1" because recording is entity1
			formFields.push({
				name: `rels.${n}.backward`,
				value: '1',
			});

			// rels.{N}.target_credit — credited name
			formFields.push({
				name: `rels.${n}.target_credit`,
				value: credit.creditedName ?? credit.name,
			});

			// rels.{N}.attributes.{M}.* — attribute type UUIDs
			if (mapping.mbAttributes) {
				for (let m = 0; m < mapping.mbAttributes.length; m++) {
					const attr = mapping.mbAttributes[m];

					// Skip attributes with empty typeIds (unconfirmed)
					if (!attr.typeId) continue;

					formFields.push({
						name: `rels.${n}.attributes.${m}.type`,
						value: attr.typeId,
					});

					// Optionally add credited_as for the attribute
					if (credit.creditedName) {
						formFields.push({
							name: `rels.${n}.attributes.${m}.credited_as`,
							value: credit.creditedName,
						});
					}
				}
			}

			relIndex++;
		}

		return { formFields, skipped, skipReasons };
	}

	/**
	 * Check if a credit represents a work-level relationship.
	 * Uses both the mapping's workLevel flag and the isWorkLevelRole utility.
	 */
	private isWorkLevelCredit(credit: TrackCredit, mapping: RoleMapping): boolean {
		if (mapping.workLevel) return true;
		return isWorkLevelRole(credit.role) || isWorkLevelRole(credit.originalRole ?? '');
	}

	/**
	 * Check if a RoleMapping has unconfirmed (empty) UUIDs.
	 */
	private isUnconfirmedMapping(mapping: RoleMapping): boolean {
		return !mapping.mbRelationshipId || mapping.mbRelationshipId === '';
	}

	/**
	 * Build an edit note for the submission.
	 * Format: "Imported with mirmir, using data from: [source names]"
	 */
	private buildEditNote(credits: TrackCredit[]): string {
		const sourceNames = [...new Set(credits.flatMap((c) => c.sources))];
		return `Imported with mirmir, using data from: ${sourceNames.join(', ')}`;
	}
}
