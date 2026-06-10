import { describe, expect, it } from 'vitest';

import {
    isThemePreviewMessage,
    isThemePreviewReadyMessage,
    THEME_PREVIEW_MESSAGE_TYPE,
    THEME_PREVIEW_READY_MESSAGE_TYPE,
} from './messages';

describe('preview message guards', () => {
    it('accepts a well-formed theme-preview message', () => {
        expect(
            isThemePreviewMessage({
                type: THEME_PREVIEW_MESSAGE_TYPE,
                vars: [['--color-background', '#0b0b0b']],
                remove: ['--accent'],
            }),
        ).toBe(true);
    });

    it('accepts a theme-preview message with vars/remove omitted', () => {
        expect(isThemePreviewMessage({ type: THEME_PREVIEW_MESSAGE_TYPE })).toBe(true);
    });

    it('rejects wrong discriminators, primitives, and null', () => {
        expect(isThemePreviewMessage({ type: 'theme-preview-ready' })).toBe(false);
        expect(isThemePreviewMessage('theme-preview')).toBe(false);
        expect(isThemePreviewMessage(null)).toBe(false);
        expect(isThemePreviewMessage(undefined)).toBe(false);
    });

    it('rejects structurally-malformed vars and remove payloads', () => {
        expect(isThemePreviewMessage({ type: THEME_PREVIEW_MESSAGE_TYPE, vars: [['--a']] })).toBe(false);
        expect(isThemePreviewMessage({ type: THEME_PREVIEW_MESSAGE_TYPE, vars: [['--a', 1]] })).toBe(false);
        expect(isThemePreviewMessage({ type: THEME_PREVIEW_MESSAGE_TYPE, vars: 'nope' })).toBe(false);
        expect(isThemePreviewMessage({ type: THEME_PREVIEW_MESSAGE_TYPE, remove: [42] })).toBe(false);
        expect(isThemePreviewMessage({ type: THEME_PREVIEW_MESSAGE_TYPE, remove: {} })).toBe(false);
    });

    it('narrows the readiness handshake by discriminator only', () => {
        expect(isThemePreviewReadyMessage({ type: THEME_PREVIEW_READY_MESSAGE_TYPE })).toBe(true);
        expect(isThemePreviewReadyMessage({ type: THEME_PREVIEW_MESSAGE_TYPE })).toBe(false);
        expect(isThemePreviewReadyMessage(null)).toBe(false);
        expect(isThemePreviewReadyMessage('theme-preview-ready')).toBe(false);
    });
});
