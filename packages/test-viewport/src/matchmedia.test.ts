import { afterEach, describe, expect, it, vi } from 'vitest';

import { installMatchMedia, type MatchMediaController } from './matchmedia';

let controller: MatchMediaController | undefined;

afterEach(() => {
    controller?.cleanup();
    controller = undefined;
});

describe('installMatchMedia', () => {
    it('evaluates min-width / max-width against the emulated width', () => {
        controller = installMatchMedia(500);
        expect(window.matchMedia('(min-width: 640px)').matches).toBe(false);
        expect(window.matchMedia('(max-width: 640px)').matches).toBe(true);

        controller.setViewport(800);
        expect(window.matchMedia('(min-width: 640px)').matches).toBe(true);
        expect(window.matchMedia('(max-width: 640px)').matches).toBe(false);
    });

    it('combines and-joined clauses and ignores the screen media type', () => {
        controller = installMatchMedia(800, { height: 600 });
        expect(window.matchMedia('screen and (min-width: 768px) and (max-width: 1023px)').matches).toBe(true);
        expect(window.matchMedia('(min-width: 768px) and (max-width: 700px)').matches).toBe(false);
    });

    it('derives orientation from width vs height', () => {
        controller = installMatchMedia(390, { height: 844 });
        expect(window.matchMedia('(orientation: portrait)').matches).toBe(true);
        expect(window.matchMedia('(orientation: landscape)').matches).toBe(false);

        controller.setViewport({ width: 1024, height: 768 });
        expect(window.matchMedia('(orientation: landscape)').matches).toBe(true);
    });

    it('treats an unsupported feature as a non-match instead of passing silently', () => {
        controller = installMatchMedia(800);
        expect(window.matchMedia('(prefers-color-scheme: dark)').matches).toBe(false);
        expect(window.matchMedia('not-a-query').matches).toBe(false);
    });

    it('seeds innerWidth/innerHeight and fires resize on setViewport', () => {
        controller = installMatchMedia(500, { height: 700 });
        expect(window.innerWidth).toBe(500);
        expect(window.innerHeight).toBe(700);

        const onResize = vi.fn();
        window.addEventListener('resize', onResize);
        controller.setViewport(900);
        expect(onResize).toHaveBeenCalledTimes(1);
        expect(window.innerWidth).toBe(900);
        window.removeEventListener('resize', onResize);
    });

    it('notifies change listeners only when the match flips', () => {
        controller = installMatchMedia(500);
        const mql = window.matchMedia('(min-width: 768px)');
        const onChange = vi.fn();
        mql.addEventListener('change', onChange);

        controller.setViewport(600); // still < 768 — no flip
        expect(onChange).not.toHaveBeenCalled();

        controller.setViewport(800); // crosses 768 — flips to match
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0]?.[0]).toMatchObject({ matches: true });

        mql.removeEventListener('change', onChange);
        controller.setViewport(500); // would flip back, but listener removed
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('supports the deprecated addListener/removeListener API', () => {
        controller = installMatchMedia(500);
        const mql = window.matchMedia('(min-width: 768px)');
        const onChange = vi.fn();
        mql.addListener?.(onChange);
        controller.setViewport(800);
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('restores the original globals on cleanup', () => {
        const hadMatchMedia = 'matchMedia' in window;
        const local = installMatchMedia(500);
        expect(typeof window.matchMedia).toBe('function');
        local.cleanup();
        // happy-dom provides no matchMedia by default, so cleanup removes our shim.
        expect('matchMedia' in window).toBe(hadMatchMedia);
    });
});
