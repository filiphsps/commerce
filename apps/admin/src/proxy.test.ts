import { describe, expect, it } from 'vitest';

describe('admin proxy', () => {
    it('exports a default function (pass-through)', async () => {
        const mod = await import('./proxy');
        expect(typeof mod.default).toBe('function');
    });

    it('exports a config object with a matcher array', async () => {
        const { config } = await import('./proxy');
        expect(Array.isArray(config.matcher)).toBe(true);
        expect(config.matcher.length).toBeGreaterThan(0);
    });

    it('matcher pattern excludes Next.js internal prefixes (_next, _static, _vercel)', async () => {
        const { config } = await import('./proxy');
        const matcherStr = String(config.matcher[0]);
        expect(matcherStr).toContain('_next');
        expect(matcherStr).toContain('_static');
        expect(matcherStr).toContain('_vercel');
    });

    it('matcher pattern excludes favicon.ico and static files', async () => {
        const { config } = await import('./proxy');
        const matcherStr = String(config.matcher[0]);
        expect(matcherStr).toContain('favicon.ico');
    });

    it('config includes missing header conditions to skip prefetch requests', async () => {
        const { config } = await import('./proxy');
        expect(Array.isArray(config.missing)).toBe(true);
        const keys = config.missing!.map((m: { key: string }) => m.key);
        expect(keys).toContain('next-router-prefetch');
        expect(keys).toContain('purpose');
    });
});
