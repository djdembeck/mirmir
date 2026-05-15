import { MBInjector } from '@/mirmir/mb_injector.ts';
import { getLogger } from 'std/log/get_logger.ts';

import type { TrackCredit } from '@/harmonizer/types.ts';

interface InjectRequestBody {
	recordingMbid: string;
	credits: TrackCredit[];
	dryRun?: boolean;
}

function getEnvVar(name: string): string | undefined {
	try {
		return Deno.env.get(name);
	} catch {
		return undefined;
	}
}

export const handler = {
	async POST(req: Request): Promise<Response> {
		const log = getLogger('harmony.server');

		try {
			const body = await req.json() as InjectRequestBody;
			const { recordingMbid, credits, dryRun = false } = body;

			if (!recordingMbid || !credits || !Array.isArray(credits)) {
				return new Response(
					JSON.stringify({ error: 'Missing required fields: recordingMbid, credits' }),
					{ status: 400, headers: { 'Content-Type': 'application/json' } },
				);
			}

			const username = getEnvVar('MIRMIR_MB_USERNAME');
			const password = getEnvVar('MIRMIR_MB_PASSWORD');
			const baseUrl = getEnvVar('MIRMIR_MB_BASE_URL') ?? 'https://test.musicbrainz.org';

			if (!username || !password) {
				return new Response(
					JSON.stringify({ error: 'MB bot credentials not configured. Set MIRMIR_MB_USERNAME and MIRMIR_MB_PASSWORD.' }),
					{ status: 503, headers: { 'Content-Type': 'application/json' } },
				);
			}

			const injector = new MBInjector({ baseUrl, username, password });

			if (dryRun) {
				const result = await injector.dryRun(recordingMbid, credits);
				return new Response(
					JSON.stringify({ success: true, dryRun: true, result }),
					{ status: 200, headers: { 'Content-Type': 'application/json' } },
				);
			}

			await injector.login();
			const result = await injector.injectCredits(recordingMbid, credits);

			return new Response(
				JSON.stringify({ success: true, dryRun: false, result }),
				{ status: 200, headers: { 'Content-Type': 'application/json' } },
			);
		} catch (error) {
			log.error('Injection API error:', error);
			return new Response(
				JSON.stringify({
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error',
				}),
				{ status: 500, headers: { 'Content-Type': 'application/json' } },
			);
		}
	},
};
