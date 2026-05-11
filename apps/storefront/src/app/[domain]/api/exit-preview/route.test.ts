import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
	draftMode: vi.fn().mockResolvedValue({ disable: vi.fn() }),
}));

vi.mock('@prismicio/next', () => ({
	exitPreview: vi
		.fn()
		.mockResolvedValue(new Response('Exit Preview', { status: 307 })),
}));

import { GET } from './route';

describe('GET /api/exit-preview', () => {
	it('returns a response (200, 302, or 307)', async () => {
		const res = await GET();
		expect([200, 302, 307]).toContain(res.status);
	});
});
