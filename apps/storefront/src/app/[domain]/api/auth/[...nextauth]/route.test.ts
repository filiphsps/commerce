import { describe, expect, it, vi } from 'vitest';

vi.mock('@/auth', () => ({
	getAuth: vi.fn().mockReturnValue({
		handlers: {
			GET: vi.fn().mockResolvedValue(new Response('GET', { status: 200 })),
			POST: vi.fn().mockResolvedValue(new Response('POST', { status: 200 })),
		},
	}),
}));

vi.mock('@nordcom/commerce-db', () => ({
	Shop: {
		findByDomain: vi.fn().mockResolvedValue({
			id: 'mock-shop-id',
			domain: 'staging.demo.nordcom.io',
		}),
	},
}));

import { GET, POST } from './route';

describe('NextAuth route handler', () => {
	it('exports a GET handler', () => {
		expect(typeof GET).toBe('function');
	});
	it('exports a POST handler', () => {
		expect(typeof POST).toBe('function');
	});
});
