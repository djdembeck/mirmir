import { fetchRecordingCredits } from '@/mirmir/mb_credits.ts';
import { getLogger } from 'std/log/get_logger.ts';

const MB_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function rejectCrossOrigin(req: Request): Response | null {
	const origin = req.headers.get('Origin');
	if (!origin) return null;
	const host = req.headers.get('Host') ?? new URL(req.url).host;
	const allowedOrigin = `${req.headers.get('X-Forwarded-Proto') ?? 'http'}://${host}`;
	if (origin !== allowedOrigin) {
		return new Response(
			JSON.stringify({ error: 'Cross-origin requests are not allowed' }),
			{ status: 403, headers: { 'Content-Type': 'application/json' } },
		);
	}
	return null;
}

export const handler = {
	async POST(req: Request): Promise<Response> {
		const log = getLogger('harmony.server');

		const csrfRejection = rejectCrossOrigin(req);
		if (csrfRejection) return csrfRejection;

		try {
			const body = await req.json() as { recordingMbids: string[] };

			if (!body.recordingMbids || !Array.isArray(body.recordingMbids)) {
				return new Response(
					JSON.stringify({ error: 'Missing required field: recordingMbids' }),
					{ status: 400, headers: { 'Content-Type': 'application/json' } },
				);
			}

			for (const mbid of body.recordingMbids) {
				if (!MB_UUID_RE.test(mbid)) {
					return new Response(
						JSON.stringify({ error: `Invalid recordingMbid: ${mbid}` }),
						{ status: 400, headers: { 'Content-Type': 'application/json' } },
					);
				}
			}

			const results = new Map<string, unknown>();
			for (const mbid of body.recordingMbids) {
				const credits = await fetchRecordingCredits(mbid);
				results.set(mbid, credits);
			}

			return new Response(
				JSON.stringify(Object.fromEntries(results)),
				{ status: 200, headers: { 'Content-Type': 'application/json' } },
			);
		} catch (error) {
			log.error('MB credits API error:', error);
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
