// @vitest-environment happy-dom
import { act, fireEvent, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Form, type FormState, useField } from '../form';
import { type EditorDocumentCreateBinding, EditorFormToolbar } from './editor-form-toolbar';

const Toolbar = vi.fn((props: { hasDrafts: boolean }) => (
    <div data-testid="t" data-has-drafts={String(props.hasDrafts)} />
));

/**
 * Renders the toolbar inside the REAL native `<Form>` — the context it reads
 * `useForm`/`useFormModified` from since the CMSDATA-06 rewire onto the
 * native form core.
 *
 * @param children - The toolbar under test.
 * @returns The testing-library render result.
 */
const renderInForm = (children: ReactNode) => render(<Form action={async () => {}}>{children}</Form>);

describe('<EditorFormToolbar>', () => {
    it('passes hasDrafts=true when autosave is configured', () => {
        const { getByTestId } = renderInForm(
            <EditorFormToolbar
                Toolbar={Toolbar as never}
                saveDraftAction={async () => {}}
                publishAction={async () => {}}
                autosave={{ interval: 2000 }}
            />,
        );
        expect(getByTestId('t').dataset.hasDrafts).toBe('true');
    });

    it('passes hasDrafts=false when autosave is omitted', () => {
        const { getByTestId } = renderInForm(
            <EditorFormToolbar
                Toolbar={Toolbar as never}
                saveDraftAction={async () => {}}
                publishAction={async () => {}}
            />,
        );
        expect(getByTestId('t').dataset.hasDrafts).toBe('false');
    });

    it('renders the localeSwitcher slot to the left of the toolbar', () => {
        const { getByTestId } = renderInForm(
            <EditorFormToolbar
                Toolbar={Toolbar as never}
                saveDraftAction={async () => {}}
                publishAction={async () => {}}
                localeSwitcher={<div data-testid="switcher" />}
            />,
        );
        expect(getByTestId('switcher')).toBeTruthy();
    });

    it('omits the localeSwitcher slot when not provided', () => {
        const { queryByTestId } = renderInForm(
            <EditorFormToolbar
                Toolbar={Toolbar as never}
                saveDraftAction={async () => {}}
                publishAction={async () => {}}
            />,
        );
        expect(queryByTestId('switcher')).toBeNull();
    });
});

const clean = (value: unknown): FormState[string] => ({ value, initialValue: value, valid: true });

/**
 * Minimal field bound through the native context so the autosave suite can
 * type into the form the toolbar serializes.
 *
 * @param props.path - Dotted form-state path to bind.
 * @param props.next - Value the test button writes into the field.
 */
function EditProbe({ path, next }: { path: string; next: string }) {
    const { setValue } = useField<string>({ path });
    return (
        <button data-testid={`edit-${path}-${next}`} type="button" onClick={() => setValue(next)}>
            edit
        </button>
    );
}

/**
 * Extracts the parsed `_payload` blob from an autosave invocation.
 *
 * @param save - The spied save action.
 * @param call - Zero-based invocation index.
 * @returns The posted document values.
 */
function postedPayload(save: ReturnType<typeof vi.fn>, call: number): Record<string, unknown> {
    const formData = save.mock.calls[call]?.[0] as FormData;
    return JSON.parse(String(formData.get('_payload'))) as Record<string, unknown>;
}

describe('<EditorFormToolbar> interval autosave', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    /**
     * Renders the toolbar plus edit probes inside the real `<Form>` with the 2s
     * autosave armed against the spied draft action.
     *
     * @param save - The draft action spy the autosave loop posts through.
     * @param probes - Edit probes to mount alongside the toolbar.
     * @returns The render result.
     */
    const renderAutosaveSurface = (save: ReturnType<typeof vi.fn>, probes: ReactNode) =>
        render(
            <Form action={async () => {}} initialState={{ title: clean('Server'), summary: clean('Base') }}>
                {probes}
                <EditorFormToolbar
                    Toolbar={Toolbar as never}
                    saveDraftAction={save}
                    publishAction={async () => {}}
                    autosave={{ interval: 2000 }}
                />
            </Form>,
        );

    it('does not autosave an untouched form (baseline seeded on mount)', async () => {
        const save = vi.fn().mockResolvedValue(undefined);
        renderAutosaveSurface(save, null);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(6000);
        });

        expect(save).not.toHaveBeenCalled();
    });

    it('keeps autosaving on every subsequent edit, not just the first (re-arm regression)', async () => {
        // The pre-CMSGATE-01 implementation armed a single setTimeout gated on
        // `modified`, which stays true after the first save — so the SECOND
        // edit never autosaved. This pins the interval re-arm.
        const save = vi.fn().mockResolvedValue(undefined);
        const { getByTestId } = renderAutosaveSurface(
            save,
            <>
                <EditProbe path="title" next="First" />
                <EditProbe path="title" next="Second" />
            </>,
        );

        act(() => {
            fireEvent.click(getByTestId('edit-title-First'));
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });
        expect(save).toHaveBeenCalledTimes(1);
        expect(postedPayload(save, 0).title).toBe('First');

        act(() => {
            fireEvent.click(getByTestId('edit-title-Second'));
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });
        expect(save).toHaveBeenCalledTimes(2);
        expect(postedPayload(save, 1).title).toBe('Second');
    });

    it('does not re-post an unchanged blob on the next tick', async () => {
        const save = vi.fn().mockResolvedValue(undefined);
        const { getByTestId } = renderAutosaveSurface(save, <EditProbe path="title" next="Typed" />);

        act(() => {
            fireEvent.click(getByTestId('edit-title-Typed'));
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });

        expect(save).toHaveBeenCalledTimes(1);
    });

    it('keeps a keystroke typed while a save is in flight and posts it on the next tick', async () => {
        let release: (() => void) | undefined;
        const save = vi.fn(
            () =>
                new Promise<void>((resolve) => {
                    release = resolve;
                }),
        );
        const { getByTestId } = renderAutosaveSurface(
            save,
            <>
                <EditProbe path="summary" next="Edited summary" />
                <EditProbe path="title" next="Typed mid-flight" />
            </>,
        );

        act(() => {
            fireEvent.click(getByTestId('edit-summary-Edited summary'));
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });
        expect(save).toHaveBeenCalledTimes(1);
        expect(postedPayload(save, 0).summary).toBe('Edited summary');

        // The user types into ANOTHER field while the first save is in flight.
        act(() => {
            fireEvent.click(getByTestId('edit-title-Typed mid-flight'));
        });
        // Ticks during the in-flight save are skipped, never queued twice.
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });
        expect(save).toHaveBeenCalledTimes(1);

        await act(async () => {
            release?.();
            await vi.advanceTimersByTimeAsync(2000);
        });
        expect(save).toHaveBeenCalledTimes(2);
        const second = postedPayload(save, 1);
        expect(second.title).toBe('Typed mid-flight');
        expect(second.summary).toBe('Edited summary');
    });
});

describe('<EditorFormToolbar> /new/ create binding (G4FIX-04)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    /** The spied create-binding triple every test inspects. */
    type SpiedBinding = {
        create: ReturnType<typeof vi.fn<EditorDocumentCreateBinding['create']>>;
        saveDraftFor: ReturnType<typeof vi.fn<EditorDocumentCreateBinding['saveDraftFor']>>;
        publishFor: ReturnType<typeof vi.fn<EditorDocumentCreateBinding['publishFor']>>;
    };

    /**
     * Builds a binding whose create resolves `doc-1` and whose draft/publish
     * posts resolve immediately.
     *
     * @returns The spied binding.
     */
    const buildBinding = (): SpiedBinding => ({
        create: vi.fn<EditorDocumentCreateBinding['create']>(async () => ({
            id: 'doc-1',
            editUrl: '/a.test/content/pages/doc-1/?locale=sv',
        })),
        saveDraftFor: vi.fn<EditorDocumentCreateBinding['saveDraftFor']>(async () => {}),
        publishFor: vi.fn<EditorDocumentCreateBinding['publishFor']>(async () => {}),
    });

    /**
     * Renders the toolbar in /new/ mode (create binding, 2s autosave) inside
     * the real `<Form>` alongside the given edit probes.
     *
     * @param binding - The spied create binding.
     * @param probes - Edit probes to mount alongside the toolbar.
     * @returns The render result.
     */
    const renderNewSurface = (binding: SpiedBinding, probes: ReactNode) =>
        render(
            <Form action={async () => {}} initialState={{ title: clean('') }}>
                {probes}
                <EditorFormToolbar Toolbar={Toolbar as never} createBinding={binding} autosave={{ interval: 2000 }} />
            </Form>,
        );

    /**
     * Reads the `_payload`'s `title` of a binding invocation whose `FormData`
     * sits at `argIndex`.
     *
     * @param spy - The spied binding method.
     * @param call - Zero-based invocation index.
     * @param argIndex - Position of the `FormData` argument.
     * @returns The posted title.
     */
    const postedTitle = (spy: ReturnType<typeof vi.fn>, call: number, argIndex: number): unknown => {
        const formData = spy.mock.calls[call]?.[argIndex] as FormData;
        return (JSON.parse(String(formData.get('_payload'))) as Record<string, unknown>).title;
    };

    it('issues exactly one create across three diverged ticks, then saveDrafts against the bound id', async () => {
        const binding = buildBinding();
        const { getByTestId } = renderNewSurface(
            binding,
            <>
                <EditProbe path="title" next="One" />
                <EditProbe path="title" next="Two" />
                <EditProbe path="title" next="Three" />
            </>,
        );

        for (const next of ['One', 'Two', 'Three']) {
            act(() => {
                fireEvent.click(getByTestId(`edit-title-${next}`));
            });
            await act(async () => {
                await vi.advanceTimersByTimeAsync(2000);
            });
        }

        expect(binding.create).toHaveBeenCalledTimes(1);
        expect(binding.saveDraftFor).toHaveBeenCalledTimes(2);
        expect(binding.saveDraftFor.mock.calls.map((call) => call[0])).toEqual(['doc-1', 'doc-1']);
        expect(postedTitle(binding.create, 0, 0)).toBe('One');
        expect(postedTitle(binding.saveDraftFor, 0, 1)).toBe('Two');
        expect(postedTitle(binding.saveDraftFor, 1, 1)).toBe('Three');
    });

    it('shallow-replaces the URL with the edit route after the first create resolves', async () => {
        const replaceState = vi.spyOn(window.history, 'replaceState');
        const binding = buildBinding();
        const { getByTestId } = renderNewSurface(binding, <EditProbe path="title" next="Typed" />);

        act(() => {
            fireEvent.click(getByTestId('edit-title-Typed'));
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });

        expect(replaceState).toHaveBeenCalledTimes(1);
        expect(replaceState.mock.calls[0]?.[2]).toBe('/a.test/content/pages/doc-1/?locale=sv');
        replaceState.mockRestore();
    });

    it('keeps retrying the create after a failure and never half-binds', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const binding = buildBinding();
        binding.create
            .mockRejectedValueOnce(new TypeError('create failed'))
            .mockResolvedValueOnce({ id: 'doc-2', editUrl: '/a.test/content/pages/doc-2/?locale=sv' });
        const { getByTestId } = renderNewSurface(
            binding,
            <>
                <EditProbe path="title" next="Typed" />
                <EditProbe path="title" next="More" />
            </>,
        );

        act(() => {
            fireEvent.click(getByTestId('edit-title-Typed'));
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });
        expect(binding.create).toHaveBeenCalledTimes(1);
        expect(binding.saveDraftFor).not.toHaveBeenCalled();

        // The baseline never advanced past the failed blob, so the SAME
        // divergence retries on the next tick — as a create, not a draft save
        // against a phantom id.
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });
        expect(binding.create).toHaveBeenCalledTimes(2);
        expect(binding.saveDraftFor).not.toHaveBeenCalled();

        // Now bound: the next divergence drafts against the created id.
        act(() => {
            fireEvent.click(getByTestId('edit-title-More'));
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });
        expect(binding.create).toHaveBeenCalledTimes(2);
        expect(binding.saveDraftFor).toHaveBeenCalledTimes(1);
        expect(binding.saveDraftFor.mock.calls[0]?.[0]).toBe('doc-2');
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
    });

    it('coalesces a publish fired while the create is in flight onto the single create', async () => {
        let release: ((result: { id: string; editUrl: string }) => void) | undefined;
        const binding = buildBinding();
        binding.create.mockImplementation(
            () =>
                new Promise<{ id: string; editUrl: string }>((resolve) => {
                    release = resolve;
                }),
        );
        const { getByTestId } = renderNewSurface(binding, <EditProbe path="title" next="Typed" />);

        act(() => {
            fireEvent.click(getByTestId('edit-title-Typed'));
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });
        expect(binding.create).toHaveBeenCalledTimes(1);

        // Publish lands while the create round-trip is still on the wire: it
        // must wait for THAT create, never start a second one.
        const shell = Toolbar.mock.calls.at(-1)?.[0] as unknown as { publishAction: () => Promise<void> };
        let publishPromise: Promise<void> | undefined;
        await act(async () => {
            publishPromise = shell.publishAction();
            await vi.advanceTimersByTimeAsync(0);
        });
        expect(binding.create).toHaveBeenCalledTimes(1);
        expect(binding.publishFor).not.toHaveBeenCalled();

        await act(async () => {
            release?.({ id: 'doc-3', editUrl: '/a.test/content/pages/doc-3/?locale=sv' });
            await publishPromise;
        });
        expect(binding.create).toHaveBeenCalledTimes(1);
        expect(binding.publishFor).toHaveBeenCalledTimes(1);
        expect(binding.publishFor.mock.calls[0]?.[0]).toBe('doc-3');
    });
});
