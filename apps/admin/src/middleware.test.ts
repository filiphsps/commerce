import { describe, expect, it, vi } from 'vitest';

// The admin middleware is a thin NextAuth wrapper:
//   const { auth } = NextAuth(authConfig);
//   export default auth(() => NextResponse.next());
//
// NextAuth intercepts unauthenticated requests and redirects to the signIn page before our
// callback ever runs. We test the auth-gating contract and the exported config shape.

// Mock auth.config so NextAuth doesn't try to resolve real providers/secrets at import time.
vi.mock('@/utils/auth.config', () => ({
    default: {
        providers: [],
        secret: 'test-secret',
    },
}));

// Mock the auth adapter so it doesn't reach for MongoDB.
vi.mock('@/utils/auth.adapter', () => ({
    AuthAdapter: vi.fn(() => ({})),
}));

// Mock server-only guard so the auth util can be imported in a Node/happy-dom environment.
vi.mock('server-only', () => ({}));

// Mock next-auth: `auth()` returns a handler function so `export default auth(callback)` yields a function.
const mockAuthHandler = vi.fn();
const mockAuth = vi.fn(() => mockAuthHandler);
vi.mock('next-auth', () => ({
    default: vi.fn(() => ({
        auth: mockAuth,
        handlers: { GET: vi.fn(), POST: vi.fn() },
        signIn: vi.fn(),
        signOut: vi.fn(),
    })),
}));

describe('admin middleware', () => {
    it('exports a default function (the NextAuth auth middleware handler)', async () => {
        const mod = await import('./middleware');
        // NextAuth's auth() is called with our callback and returns a handler function.
        expect(typeof mod.default).toBe('function');
    });

    it('exports a config object with a matcher array', async () => {
        const { config } = await import('./middleware');
        expect(Array.isArray(config.matcher)).toBe(true);
        expect(config.matcher.length).toBeGreaterThan(0);
    });

    it('matcher pattern excludes Next.js internal prefixes (_next, _static, _vercel)', async () => {
        const { config } = await import('./middleware');
        // The matcher is a negative-lookahead regex string. Paths matching _next|_static|_vercel
        // must NOT be captured. We verify by checking what the pattern string contains.
        const matcherStr = String(config.matcher[0]);
        expect(matcherStr).toContain('_next');
        expect(matcherStr).toContain('_static');
        expect(matcherStr).toContain('_vercel');
    });

    it('matcher pattern excludes favicon.ico and static files', async () => {
        const { config } = await import('./middleware');
        const matcherStr = String(config.matcher[0]);
        expect(matcherStr).toContain('favicon.ico');
    });

    it('config includes missing header conditions to skip prefetch requests', async () => {
        const { config } = await import('./middleware');
        expect(Array.isArray(config.missing)).toBe(true);
        const keys = config.missing!.map((m: { key: string }) => m.key);
        expect(keys).toContain('next-router-prefetch');
        expect(keys).toContain('purpose');
    });

    it('the auth callback always returns NextResponse.next() (pass-through for authenticated requests)', async () => {
        // The callback passed to auth() is `() => NextResponse.next()`.
        // We assert that auth() was called with a function (the callback).
        await import('./middleware');
        expect(mockAuth).toHaveBeenCalledWith(expect.any(Function));
    });

    it('public auth paths (/api/auth/...) are handled by NextAuth internally, not excluded by matcher', async () => {
        // NextAuth's own middleware intercepts /api/auth/* before our callback runs.
        // Our matcher deliberately includes those paths so NextAuth can handle them.
        const { config } = await import('./middleware');
        const matcherStr = String(config.matcher[0]);
        // The negative lookahead does NOT exclude /api/auth paths — NextAuth handles them.
        expect(matcherStr).not.toContain('api/auth');
    });
});
