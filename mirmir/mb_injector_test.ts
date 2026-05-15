import { assertEquals } from 'std/assert/assert_equals.ts';
import { assertNotEquals } from 'std/assert/assert_not_equals.ts';
import { describe, it, beforeEach } from '@std/testing/bdd';
import { MBInjector, resetInjectorRateLimiter, type InjectionResult, type DryRunResult } from './mb_injector.ts';
import type { TrackCredit } from '@/harmonizer/types.ts';

const RECORDING_MBID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const ARTIST_MBID = '23456789-2345-2345-2345-234567890123';

function createInjector(): MBInjector {
	return new MBInjector({
		baseUrl: 'https://test.musicbrainz.org',
		username: 'testbot',
		password: 'testpass',
	});
}

function makeCredit(overrides: Partial<TrackCredit> = {}): TrackCredit {
	return {
		name: 'Test Artist',
		role: 'producer',
		originalRole: 'Producer',
		sources: ['Tidal'],
		mbid: ARTIST_MBID,
		...overrides,
	};
}

function toUrlStr(input: string | URL | Request): string {
	if (typeof input === 'string') return input;
	if (input instanceof URL) return input.href;
	return input.url;
}

describe('MBInjector', () => {
	beforeEach(() => {
		resetInjectorRateLimiter();
	});

	describe('dryRun', () => {
		it('logs credits that would be submitted with full rels.{N}.* field details', async () => {
			const injector = createInjector();
			const credits = [makeCredit()];

			const result = await injector.dryRun(RECORDING_MBID, credits);

			assertEquals(result.wouldSubmit, 1);
			assertEquals(result.wouldSkip, 0);
			assertEquals(result.details.some((d) => d.includes('rels.0.type')), true);
			assertEquals(result.details.some((d) => d.includes('rels.0.target')), true);
			assertEquals(result.details.some((d) => d.includes('rels.0.backward')), true);
			assertEquals(result.details.some((d) => d.includes('rels.0.target_credit')), true);
		});

		it('includes rels.{N}.type with correct MB relationship type UUID', async () => {
			const injector = createInjector();
			const credits = [makeCredit({ role: 'producer', originalRole: 'Producer' })];

			const result = await injector.dryRun(RECORDING_MBID, credits);

			const typeLine = result.details.find((d) => d.includes('rels.0.type'));
			assertNotEquals(typeLine, undefined);
			assertEquals(
				typeLine!.includes('5c0ceac3-feb4-41f0-868d-dc06f6e27fc0'),
				true,
				'rels.0.type should contain producer UUID',
			);
		});

		it('includes rels.{N}.attributes.{M}.type with correct MB attribute type UUID', async () => {
			const injector = createInjector();
			const credits = [makeCredit({
				role: 'performer',
				originalRole: 'Featured Artist',
				sources: ['Tidal'],
			})];

			const result = await injector.dryRun(RECORDING_MBID, credits);

			const attrLine = result.details.find((d) => d.includes('rels.0.attributes.0.type'));
			assertNotEquals(attrLine, undefined);
			assertEquals(
				attrLine!.includes('b3045913-62ac-433e-9211-ac683cdf6b5c'),
				true,
				'rels.0.attributes.0.type should contain guest attribute UUID',
			);
		});

		it('makes no actual API calls during dry-run', async () => {
			const injector = createInjector();
			const credits = [makeCredit()];

			let fetchCalled = false;
			const originalFetch = globalThis.fetch;
			globalThis.fetch = async () => {
				fetchCalled = true;
				return new Response('', { status: 200 });
			};

			try {
				await injector.dryRun(RECORDING_MBID, credits);
				assertEquals(fetchCalled, false, 'dryRun should not call fetch');
			} finally {
				globalThis.fetch = originalFetch;
			}
		});

		it('logs Composer/Lyricist credits as "skipped: work-level"', async () => {
			const injector = createInjector();
			const credits = [
				makeCredit({ role: 'composer', originalRole: 'Composer', sources: ['Tidal'] }),
				makeCredit({ role: 'lyricist', originalRole: 'Lyricist', sources: ['Tidal'] }),
			];

			const result = await injector.dryRun(RECORDING_MBID, credits);

			assertEquals(result.wouldSubmit, 0);
			assertEquals(result.wouldSkip, 2);
			assertEquals(
				result.details.some((d) => d.includes('work-level relationship')),
				true,
			);
		});

		it('skips credits without mbid', async () => {
			const injector = createInjector();
			const credits = [makeCredit({ mbid: undefined })];

			const result = await injector.dryRun(RECORDING_MBID, credits);

			assertEquals(result.wouldSubmit, 0);
			assertEquals(result.wouldSkip, 1);
			assertEquals(
				result.details.some((d) => d.includes('no artist MBID')),
				true,
			);
		});

		it('skips credits with unconfirmed mappings', async () => {
			const injector = createInjector();
			const credits = [makeCredit({ role: 'remixer', originalRole: 'Remixer', sources: ['Discogs'] })];

			const result = await injector.dryRun(RECORDING_MBID, credits);

			assertEquals(result.wouldSubmit, 0);
			assertEquals(result.wouldSkip, 1);
			assertEquals(
				result.details.some((d) => d.includes('unconfirmed mapping')),
				true,
			);
		});

		it('includes edit notes in the details', async () => {
			const injector = createInjector();
			const credits = [makeCredit({ sources: ['Tidal', 'Discogs'] })];

			const result = await injector.dryRun(RECORDING_MBID, credits);

			assertEquals(
				result.details.some((d) => d.includes('Imported with mirmir')),
				true,
			);
			assertEquals(
				result.details.some((d) => d.includes('Tidal') && d.includes('Discogs')),
				true,
			);
		});

		it('handles multiple credits with correct rels indexing', async () => {
			const injector = createInjector();
			const credits = [
				makeCredit({ role: 'producer', originalRole: 'Producer', sources: ['Tidal'] }),
				makeCredit({ role: 'mixer', originalRole: 'Mixing', sources: ['Tidal'] }),
			];

			const result = await injector.dryRun(RECORDING_MBID, credits);

			assertEquals(result.wouldSubmit, 2);
			assertEquals(result.details.some((d) => d.includes('rels.0.type')), true);
			assertEquals(result.details.some((d) => d.includes('rels.1.type')), true);
		});

		it('uses creditedName for target_credit when available', async () => {
			const injector = createInjector();
			const credits = [makeCredit({ creditedName: '40' })];

			const result = await injector.dryRun(RECORDING_MBID, credits);

			const creditLine = result.details.find((d) => d.includes('rels.0.target_credit'));
			assertNotEquals(creditLine, undefined);
			assertEquals(creditLine!.includes('40'), true);
		});

		it('uses name for target_credit when creditedName is absent', async () => {
			const injector = createInjector();
			const credits = [makeCredit({ name: 'Noah Shebib' })];

			const result = await injector.dryRun(RECORDING_MBID, credits);

			const creditLine = result.details.find((d) => d.includes('rels.0.target_credit'));
			assertNotEquals(creditLine, undefined);
			assertEquals(creditLine!.includes('Noah Shebib'), true);
		});
	});

	describe('injectCredits', () => {
		it('throws if not logged in', async () => {
			const injector = createInjector();
			const credits = [makeCredit()];

			let error: Error | undefined;
			try {
				await injector.injectCredits(RECORDING_MBID, credits);
			} catch (e) {
				error = e instanceof Error ? e : undefined;
			}

			assertNotEquals(error, undefined);
			assertEquals(error!.message.includes('Not logged in'), true);
		});

		it('submits form data with correct rels fields after login', async () => {
			const injector = createInjector();

			const originalFetch = globalThis.fetch;
			const fetchCalls: Array<{ url: string; method: string; body?: string }> = [];

			globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
				const urlStr = toUrlStr(input);
				const method = init?.method ?? 'GET';
				fetchCalls.push({
					url: urlStr,
					method,
					body: init?.body?.toString(),
				});

				if (urlStr.endsWith('/login') && method !== 'POST') {
					return new Response(
						'<form><input name="csrf_token" value="test-csrf-token"></form>',
						{ status: 200, headers: { 'Content-Type': 'text/html' } },
					);
				}

				if (urlStr.endsWith('/login') && method === 'POST') {
					return new Response('', {
						status: 302,
						headers: {
							'Location': '/',
							'Set-Cookie': 'session=test-session-value; Path=/',
						},
					});
				}

				if (urlStr.includes('/edit')) {
					return new Response('', { status: 302, headers: { 'Location': '/' } });
				}

				return new Response('', { status: 200 });
			};

			try {
				await injector.login();
				const credits = [makeCredit({ role: 'producer', originalRole: 'Producer', sources: ['Tidal'] })];
				const result = await injector.injectCredits(RECORDING_MBID, credits);

				assertEquals(result.submitted, 1);
				assertEquals(result.errors.length, 0);
				assertEquals(result.editUrls.length, 1);

				const editCall = fetchCalls.find((c) => c.url.includes('/edit'));
				assertNotEquals(editCall, undefined);
				assertEquals(editCall!.method, 'POST');
				assertEquals(editCall!.body!.includes('rels.0.type'), true);
				assertEquals(editCall!.body!.includes('5c0ceac3-feb4-41f0-868d-dc06f6e27fc0'), true);
				assertEquals(editCall!.body!.includes('rels.0.target'), true);
				assertEquals(editCall!.body!.includes(ARTIST_MBID), true);
				assertEquals(editCall!.body!.includes('rels.0.backward'), true);
				assertEquals(editCall!.body!.includes('edit_note'), true);
				assertEquals(editCall!.body!.includes('Imported+with+mirmir') || editCall!.body!.includes('Imported%20with%20mirmir'), true);
			} finally {
				globalThis.fetch = originalFetch;
			}
		});

		it('skips work-level, no-MBID, and unconfirmed credits during injection', async () => {
			const injector = createInjector();

			const originalFetch = globalThis.fetch;
			globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
				const urlStr = toUrlStr(input);
				const method = init?.method ?? 'GET';

				if (urlStr.endsWith('/login') && method !== 'POST') {
					return new Response(
						'<form><input name="csrf_token" value="test-csrf-token"></form>',
						{ status: 200, headers: { 'Content-Type': 'text/html' } },
					);
				}

				if (urlStr.endsWith('/login') && method === 'POST') {
					return new Response('', {
						status: 302,
						headers: {
							'Location': '/',
							'Set-Cookie': 'session=test-session-value; Path=/',
						},
					});
				}

				return new Response('', { status: 302, headers: { 'Location': '/' } });
			};

			try {
				await injector.login();
				const credits: TrackCredit[] = [
					{ name: 'Composer', role: 'composer', sources: ['Tidal'], mbid: ARTIST_MBID, originalRole: 'Composer' },
					{ name: 'No MBID', role: 'producer', sources: ['Tidal'] },
					{ name: 'Remixer', role: 'remixer', sources: ['Discogs'], mbid: ARTIST_MBID, originalRole: 'Remixer' },
				];

				const result = await injector.injectCredits(RECORDING_MBID, credits);

				assertEquals(result.submitted, 0);
				assertEquals(result.skipped, 3);
			} finally {
				globalThis.fetch = originalFetch;
			}
		});

		it('records errors when POST fails', async () => {
			const injector = createInjector();

			const originalFetch = globalThis.fetch;
			globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
				const urlStr = toUrlStr(input);
				const method = init?.method ?? 'GET';

				if (urlStr.endsWith('/login') && method !== 'POST') {
					return new Response(
						'<form><input name="csrf_token" value="test-csrf-token"></form>',
						{ status: 200, headers: { 'Content-Type': 'text/html' } },
					);
				}

				if (urlStr.endsWith('/login') && method === 'POST') {
					return new Response('', {
						status: 302,
						headers: {
							'Location': '/',
							'Set-Cookie': 'session=test-session-value; Path=/',
						},
					});
				}

				if (urlStr.includes('/edit')) {
					return new Response('Internal Server Error', { status: 500 });
				}

				return new Response('', { status: 200 });
			};

			try {
				await injector.login();
				const credits = [makeCredit()];
				const result = await injector.injectCredits(RECORDING_MBID, credits);

				assertEquals(result.errors.length, 1);
				assertEquals(result.errors[0].includes('500'), true);
			} finally {
				globalThis.fetch = originalFetch;
			}
		});
	});

	describe('login', () => {
		it('extracts CSRF token and session cookie from login flow', async () => {
			const injector = createInjector();

			const originalFetch = globalThis.fetch;
			globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
				const urlStr = toUrlStr(input);
				const method = init?.method ?? 'GET';

				if (urlStr.endsWith('/login') && method !== 'POST') {
					return new Response(
						'<form><input name="csrf_token" value="my-csrf-123"></form>',
						{ status: 200, headers: { 'Content-Type': 'text/html' } },
					);
				}

				if (urlStr.endsWith('/login') && method === 'POST') {
					return new Response('', {
						status: 302,
						headers: {
							'Location': '/',
							'Set-Cookie': 'musicbrainz_server_session=abc123def; Path=/; HttpOnly',
						},
					});
				}

				return new Response('', { status: 200 });
			};

			try {
				await injector.login();
				// If login succeeds without throwing, CSRF and cookie were extracted
				const credits = [makeCredit()];
				const result = await injector.injectCredits(RECORDING_MBID, credits);
				assertEquals(result.errors.length, 0);
			} finally {
				globalThis.fetch = originalFetch;
			}
		});

		it('throws when CSRF token is missing from login page', async () => {
			const injector = createInjector();

			const originalFetch = globalThis.fetch;
			globalThis.fetch = async () => {
				return new Response('<html>No form here</html>', { status: 200 });
			};

			try {
				let error: Error | undefined;
				try {
					await injector.login();
				} catch (e) {
					error = e instanceof Error ? e : undefined;
				}

				assertNotEquals(error, undefined);
				assertEquals(error!.message.includes('CSRF token'), true);
			} finally {
				globalThis.fetch = originalFetch;
			}
		});

		it('throws when no session cookie returned', async () => {
			const injector = createInjector();

			const originalFetch = globalThis.fetch;
			globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
				const urlStr = toUrlStr(input);
				const method = init?.method ?? 'GET';

				if (urlStr.endsWith('/login') && method !== 'POST') {
					return new Response(
						'<form><input name="csrf_token" value="test-csrf"></form>',
						{ status: 200, headers: { 'Content-Type': 'text/html' } },
					);
				}

				return new Response('', { status: 302, headers: { 'Location': '/' } });
			};

			try {
				let error: Error | undefined;
				try {
					await injector.login();
				} catch (e) {
					error = e instanceof Error ? e : undefined;
				}

				assertNotEquals(error, undefined);
				assertEquals(error!.message.includes('session cookie'), true);
			} finally {
				globalThis.fetch = originalFetch;
			}
		});
	});

	describe('rate limiting', () => {
		beforeEach(() => {
			resetInjectorRateLimiter();
		});

		it('enforces minimum 1 second between requests', async () => {
			const originalFetch = globalThis.fetch;
			globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
				const urlStr = toUrlStr(input);
				const method = init?.method ?? 'GET';

				if (urlStr.endsWith('/login') && method !== 'POST') {
					return new Response(
						'<form><input name="csrf_token" value="test-csrf"></form>',
						{ status: 200, headers: { 'Content-Type': 'text/html' } },
					);
				}

				return new Response('', {
					status: 302,
					headers: {
						'Location': '/',
						'Set-Cookie': 'session=test-val; Path=/',
					},
				});
			};

			try {
				const injector = createInjector();

				const start = Date.now();
				await injector.login();
				await injector.login();
				const end = Date.now();

				assertEquals(
					end - start >= 1000,
					true,
					`Two rate-limited calls should take >=1s, took ${end - start}ms`,
				);
			} finally {
				globalThis.fetch = originalFetch;
			}
		});
	});

	describe('Songwriter work-level skip', () => {
		it('skips Songwriter credits as work-level', async () => {
			const injector = createInjector();
			const credits = [makeCredit({
				role: 'songwriter',
				originalRole: 'Songwriter',
				sources: ['Discogs'],
				mbid: ARTIST_MBID,
			})];

			const result = await injector.dryRun(RECORDING_MBID, credits);

			assertEquals(result.wouldSubmit, 0);
			assertEquals(result.wouldSkip, 1);
			assertEquals(
				result.details.some((d) => d.includes('work-level relationship')),
				true,
			);
		});
	});

	describe('multiple attributes on a single credit', () => {
		it('includes confirmed attributes with valid typeIds', async () => {
			const injector = createInjector();
			const credits = [makeCredit({
				role: 'performer',
				originalRole: 'Featured Artist',
				sources: ['Tidal'],
			})];

			const result = await injector.dryRun(RECORDING_MBID, credits);

			assertEquals(result.wouldSubmit, 1);
			assertEquals(result.details.some((d) => d.includes('rels.0.attributes.0.type')), true);
			assertEquals(
				result.details.some((d) => d.includes('b3045913-62ac-433e-9211-ac683cdf6b5c')),
				true,
			);
		});

		it('skips attributes with unconfirmed typeIds', async () => {
			const injector = createInjector();
			const credits = [makeCredit({
				role: 'performer',
				originalRole: 'Guitar [Electric]',
				sources: ['Discogs'],
			})];

			const result = await injector.dryRun(RECORDING_MBID, credits);

			assertEquals(result.wouldSubmit, 1);
			assertEquals(
				result.details.some((d) => d.includes('rels.0.type')),
				true,
			);
			assertEquals(
				result.details.some((d) => d.includes('rels.0.attributes')),
				false,
				'unconfirmed attributes should not appear in form fields',
			);
		});
	});

	describe('empty credits array', () => {
		it('returns zero counts for empty credits', async () => {
			const injector = createInjector();
			const result = await injector.dryRun(RECORDING_MBID, []);

			assertEquals(result.wouldSubmit, 0);
			assertEquals(result.wouldSkip, 0);
		});
	});
});
