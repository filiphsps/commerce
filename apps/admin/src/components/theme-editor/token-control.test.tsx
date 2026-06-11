import { Form, useFormFields, useFormModified } from '@nordcom/commerce-cms/editor/form';
import type { ThemeTokenMeta } from '@nordcom/commerce-db/lib/theme-catalog';
import { fireEvent } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TokenControl } from '@/components/theme-editor/token-control';
import { useThemePreview } from '@/components/theme-editor/use-theme-preview';
import { render, screen } from '@/utils/test/react';

const TARGET_ORIGIN = 'https://storefront.example.com';

/** A real catalog-shaped color leaf: the storefront page background. */
const BACKGROUND_TOKEN: ThemeTokenMeta = {
    group: 'colors',
    cluster: 'core',
    path: 'theme.colors.background',
    cssVar: '--color-background',
    valueKind: 'color',
    payloadType: 'text',
};

/**
 * Exposes the bound field's live form-state value and the form-wide dirty flag
 * so assertions read what the save toolbar and autosave would see.
 *
 * @param props.path - Dotted form-state path to observe.
 * @returns A serialized `{ value, modified }` probe element.
 */
function StateProbe({ path }: { path: string }) {
    const value = useFormFields(([fields]) => fields[path]?.value);
    const modified = useFormModified();
    return <output data-testid="probe">{JSON.stringify({ value, modified })}</output>;
}

/** Parses the probe element back into `{ value, modified }`. */
function readProbe(): { value: unknown; modified: boolean } {
    return JSON.parse(screen.getByTestId('probe').textContent ?? '{}');
}

/**
 * Mounts {@link TokenControl} inside the NATIVE `<Form>` — the production
 * mount (`fieldSurface` under `DocumentFormBody`) since the Payload field
 * shell was removed from the theme route.
 *
 * @param initialValue - Seed value for the background token.
 */
function mountTokenControl(initialValue: string) {
    render(
        <Form
            action={() => undefined}
            initialState={{
                'theme.colors.background': { value: initialValue, initialValue },
            }}
        >
            <TokenControl token={BACKGROUND_TOKEN} />
            <StateProbe path="theme.colors.background" />
        </Form>,
    );
}

describe('TokenControl (native form core)', () => {
    it('writes edits to native form state and flips the dirty flag', () => {
        mountTokenControl('#123456');
        expect(readProbe()).toEqual({ value: '#123456', modified: false });

        fireEvent.change(screen.getByLabelText('Background'), { target: { value: '#654321' } });

        expect(readProbe()).toEqual({ value: '#654321', modified: true });
    });

    it('resets to the platform default from THEME_DEFAULTS', () => {
        mountTokenControl('#654321');

        fireEvent.click(screen.getByRole('button', { name: 'Reset to default' }));

        // `theme.colors.background` defaults to near-white in THEME_DEFAULTS.
        expect(readProbe()).toEqual({ value: '#fefefe', modified: true });
    });
});

describe('TokenControl → preview bridge integration', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    /**
     * Bridge harness from the CMSDATA-09 suite: runs {@link useThemePreview}
     * beside the widget and exposes the iframe-ready handshake.
     *
     * @param props.win - Fake iframe window receiving the posts.
     * @returns The handshake button.
     */
    function BridgeHarness({ win }: { win: Window }) {
        const { onIframeReady } = useThemePreview(TARGET_ORIGIN);
        return (
            <button type="button" onClick={() => onIframeReady(win)}>
                ready
            </button>
        );
    }

    it('streams a token edit to the preview iframe via postMessage', () => {
        vi.useFakeTimers();
        const postMessage = vi.fn();
        const win = { postMessage } as unknown as Window;

        render(
            <Form
                action={() => undefined}
                initialState={{
                    'theme.colors.background': { value: '#123456', initialValue: '#123456' },
                }}
            >
                <TokenControl token={BACKGROUND_TOKEN} />
                <BridgeHarness win={win} />
            </Form>,
        );

        fireEvent.click(screen.getByRole('button', { name: 'ready' }));
        expect(postMessage).toHaveBeenCalledTimes(1);

        fireEvent.change(screen.getByLabelText('Background'), { target: { value: '#654321' } });
        act(() => {
            vi.advanceTimersByTime(150);
        });

        expect(postMessage).toHaveBeenCalledTimes(2);
        const [message, origin] = postMessage.mock.calls.at(-1) as [{ vars: Array<[string, string]> }, string];
        expect(origin).toBe(TARGET_ORIGIN);
        expect(message.vars.find(([name]) => name === '--color-background')?.[1]).toBe('#654321');
    });
});
