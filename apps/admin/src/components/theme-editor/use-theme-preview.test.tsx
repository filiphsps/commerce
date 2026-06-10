import { Form, useField } from '@nordcom/commerce-cms/editor/form';
import { fireEvent } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useThemePreview } from '@/components/theme-editor/use-theme-preview';
import { render, screen } from '@/utils/test/react';

const TARGET_ORIGIN = 'https://storefront.example.com';

/**
 * Test surface that mounts {@link useThemePreview} inside the NATIVE form
 * context (the production mount point — `PreviewBridge` under
 * `DocumentFormBody`'s `<Form>`) and exposes the handshake plus a real
 * `theme.*` edit as buttons.
 *
 * @param props.targetOrigin - Origin the hook pins `postMessage` to.
 * @param props.win - Fake iframe window receiving the posts.
 * @returns Buttons driving the handshake and a background-color edit.
 */
function Harness({ targetOrigin, win }: { targetOrigin: string; win: Window }) {
    const { onIframeReady } = useThemePreview(targetOrigin);
    const { setValue } = useField<string>({ path: 'theme.colors.background' });
    return (
        <>
            <button type="button" onClick={() => onIframeReady(win)}>
                ready
            </button>
            <button type="button" onClick={() => setValue('#654321')}>
                edit
            </button>
        </>
    );
}

/**
 * Renders the harness under the native `<Form>` seeded with one `theme.*`
 * field, returning the captured `postMessage` spy.
 *
 * @param targetOrigin - Origin handed to the hook.
 * @returns The fake window's `postMessage` spy.
 */
function mountHarness(targetOrigin: string) {
    const postMessage = vi.fn();
    const win = { postMessage } as unknown as Window;
    render(
        <Form
            action={() => undefined}
            initialState={{ 'theme.colors.background': { value: '#123456', initialValue: '#123456' } }}
        >
            <Harness targetOrigin={targetOrigin} win={win} />
        </Form>,
    );
    return postMessage;
}

/** Reads the `--color-background` entry out of one posted message. */
function backgroundVar(call: unknown[]): string | undefined {
    const message = call[0] as { vars: Array<[string, string]> };
    return message.vars.find(([name]) => name === '--color-background')?.[1];
}

describe('useThemePreview (native form core)', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('flushes the current theme to the iframe on handshake, pinned to the target origin', () => {
        const postMessage = mountHarness(TARGET_ORIGIN);
        expect(postMessage).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'ready' }));

        expect(postMessage).toHaveBeenCalledTimes(1);
        const [message, origin] = postMessage.mock.calls[0] as [unknown, string];
        expect(origin).toBe(TARGET_ORIGIN);
        expect(message).toMatchObject({ type: 'theme-preview' });
        expect(backgroundVar(postMessage.mock.calls[0] as unknown[])).toBe('#123456');
    });

    it('streams a debounced update on a theme edit — no reload, just postMessage', () => {
        vi.useFakeTimers();
        const postMessage = mountHarness(TARGET_ORIGIN);

        fireEvent.click(screen.getByRole('button', { name: 'ready' }));
        expect(postMessage).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: 'edit' }));
        act(() => {
            vi.advanceTimersByTime(150);
        });

        expect(postMessage).toHaveBeenCalledTimes(2);
        const lastCall = postMessage.mock.calls.at(-1) as unknown[];
        expect(backgroundVar(lastCall)).toBe('#654321');
        expect(lastCall[1]).toBe(TARGET_ORIGIN);
    });

    it('posts nothing when the target origin is unresolvable (empty string)', () => {
        vi.useFakeTimers();
        const postMessage = mountHarness('');

        fireEvent.click(screen.getByRole('button', { name: 'ready' }));
        act(() => {
            vi.advanceTimersByTime(150);
        });

        expect(postMessage).not.toHaveBeenCalled();
    });
});
