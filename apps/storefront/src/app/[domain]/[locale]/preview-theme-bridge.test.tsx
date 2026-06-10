import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PreviewThemeBridge } from './preview-theme-bridge';

const ADMIN_ORIGIN = 'https://admin.example.com';
const FOREIGN_ORIGIN = 'https://evil.example.net';

/**
 * Dispatches a `message` event on `window` with an explicit origin, the way the
 * embedding admin (or an attacker frame) would deliver a `postMessage`.
 *
 * @param origin - The sender origin the browser would stamp on the event.
 * @param data - The message payload.
 */
function postFrom(origin: string, data: unknown): void {
    window.dispatchEvent(new MessageEvent('message', { origin, data }));
}

describe('PreviewThemeBridge', () => {
    // happy-dom enforces postMessage's targetOrigin against the (about:blank)
    // test window origin, so the bridge's mount-time handshake must be stubbed
    // out — the spy doubles as the handshake assertion target.
    let parentPost: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        parentPost = vi.fn();
        vi.spyOn(window.parent, 'postMessage').mockImplementation(parentPost as never);
    });

    afterEach(() => {
        cleanup();
        document.documentElement.removeAttribute('style');
        vi.restoreAllMocks();
    });

    it('applies CSS variables from a theme-preview message sent by the admin origin', () => {
        render(<PreviewThemeBridge adminOrigin={ADMIN_ORIGIN} />);

        postFrom(ADMIN_ORIGIN, { type: 'theme-preview', vars: [['--color-background', '#0b0b0b']], remove: [] });
        expect(document.documentElement.style.getPropertyValue('--color-background')).toBe('#0b0b0b');

        postFrom(ADMIN_ORIGIN, { type: 'theme-preview', vars: [], remove: ['--color-background'] });
        expect(document.documentElement.style.getPropertyValue('--color-background')).toBe('');
    });

    it('rejects a theme-preview message from a foreign origin', () => {
        render(<PreviewThemeBridge adminOrigin={ADMIN_ORIGIN} />);

        postFrom(FOREIGN_ORIGIN, { type: 'theme-preview', vars: [['--color-background', '#bad']], remove: [] });
        expect(document.documentElement.style.getPropertyValue('--color-background')).toBe('');
    });

    it('drops a structurally-malformed message even from the admin origin', () => {
        render(<PreviewThemeBridge adminOrigin={ADMIN_ORIGIN} />);

        postFrom(ADMIN_ORIGIN, { type: 'theme-preview', vars: 'not-a-list' });
        postFrom(ADMIN_ORIGIN, { type: 'something-else', vars: [['--color-background', '#bad']] });
        expect(document.documentElement.style.getPropertyValue('--color-background')).toBe('');
    });

    it('ignores non-custom-property names so arbitrary style keys cannot be driven', () => {
        render(<PreviewThemeBridge adminOrigin={ADMIN_ORIGIN} />);

        postFrom(ADMIN_ORIGIN, { type: 'theme-preview', vars: [['background', 'url(https://evil/x)']], remove: [] });
        expect(document.documentElement.style.getPropertyValue('background')).toBe('');
    });

    it('posts the readiness handshake to the parent pinned to the admin origin', () => {
        render(<PreviewThemeBridge adminOrigin={ADMIN_ORIGIN} />);

        expect(parentPost).toHaveBeenCalledWith({ type: 'theme-preview-ready' }, ADMIN_ORIGIN);
    });
});
