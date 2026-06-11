'use client';

import { type ComponentType, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from '../form';
import type { EditorToolbarShellProps } from '../runtime';

/**
 * The /new/-page document binding. The toolbar starts with no document; the
 * FIRST save (autosave tick, Save Draft, or Publish) goes through `create`,
 * and once it resolves the toolbar pins the returned id, shallow-replaces the
 * URL with `editUrl`, and routes every subsequent save through
 * `saveDraftFor`/`publishFor` against that one id. Without the binding every
 * diverged autosave tick issued another `create` — one duplicate draft per
 * 2 seconds (the G4FIX-04 fanout).
 */
export type EditorDocumentCreateBinding = {
    /**
     * Create the document from the first diverged form snapshot. Returns the
     * route id subsequent saves bind to plus the edit URL the toolbar replaces
     * into the address bar.
     */
    create: (formData: FormData) => Promise<{ id: string; editUrl: string }>;
    /** Draft save against the bound id. Same zero-revalidation contract as `saveDraftAction`. */
    saveDraftFor: (id: string, formData: FormData) => Promise<void>;
    /** Publish against the bound id. */
    publishFor: (id: string, formData: FormData) => Promise<void>;
};

/**
 * Props for {@link EditorFormToolbar}. Carries the shell `Toolbar` component,
 * either pre-bound server actions (edit page) or the create binding (/new/
 * page), optional autosave config, and an optional locale switcher slot
 * rendered on the left of the toolbar bar. The two action shapes are mutually
 * exclusive: a page either already knows its document id or delegates the
 * id lifecycle to the binding.
 *
 * @example
 * <EditorFormToolbar Toolbar={runtime.Toolbar} saveDraftAction={saveDraft} publishAction={publish} autosave={{ interval: 2000 }} />
 */
export type EditorFormToolbarProps = {
    /** Shell component the admin app supplies (renders Save Draft / Publish buttons). */
    Toolbar: ComponentType<EditorToolbarShellProps>;
    /** Autosave config. Omit to disable autosave entirely. */
    autosave?: { interval: number };
    /**
     * Optional locale switcher rendered on the LEFT of the toolbar bar.
     * The parent `<DocumentForm>` already wraps the toolbar in
     * `flex items-center justify-between`, so this slot lands left and
     * the Save/Publish buttons stay right.
     */
    localeSwitcher?: ReactNode;
} & (
    | {
          /** Server action (domain + id already bound). */
          saveDraftAction: (formData: FormData) => Promise<void>;
          /** Server action (domain + id already bound). */
          publishAction: (formData: FormData) => Promise<void>;
          createBinding?: undefined;
      }
    | {
          /** The /new/-page id lifecycle — see {@link EditorDocumentCreateBinding}. */
          createBinding: EditorDocumentCreateBinding;
          saveDraftAction?: undefined;
          publishAction?: undefined;
      }
);

/**
 * Wires the native CMSFORM-01 form context to:
 *   - the admin app's visual `<Toolbar>` (Save / Publish buttons),
 *   - the interval autosave loop that posts `saveDraftAction` every
 *     `autosave.interval` milliseconds while the serialized form diverges from
 *     the last round-tripped blob,
 *   - an optional locale switcher slot on the left.
 *
 * The autosave loop upholds the CMSFORM-05 invariants through the FULL action
 * path (this component posts the real bound server action, not an injected
 * callback):
 * - **Interval, not idle-debounce.** The timer is armed once per
 *   `autosave.interval`; a keystroke never resets the 2s clock, and — unlike
 *   the previous `modified`-gated one-shot — every subsequent edit keeps
 *   autosaving because each tick re-reads the live state. The blob comparison
 *   against the last successfully sent payload makes an idle form a no-op.
 * - **No keystroke clobber.** Each tick serializes the CURRENT form state via
 *   `createFormData`, so keystrokes typed while a save is in flight ride out
 *   on the next tick; in-flight survival against a server `initialState`
 *   refresh is the reducer's `REPLACE_STATE` gate.
 * - **Zero revalidation.** Nothing here imports `next/cache`; the draft action
 *   is contractually revalidation-free (see `actions.ts`).
 *
 * On /new/ (a `createBinding` instead of pre-bound actions) the toolbar also
 * owns the id lifecycle: the first save single-flights the `create` — a save
 * firing while the create round-trip is on the wire coalesces onto it instead
 * of issuing a second create — and a successful create pins the id and
 * shallow-replaces the URL with the edit route so the mounted form (and its
 * in-flight edits) survives the transition. A FAILED create pins nothing, so
 * the next save retries the create from scratch.
 *
 * Must be rendered inside the native `<Form>` — `useForm` reads from that
 * context.
 *
 * @param props - See {@link EditorFormToolbarProps}.
 * @returns The locale-switcher slot plus the shell toolbar.
 * @throws {MissingContextProviderError} When used outside a `<Form>`.
 */
export function EditorFormToolbar({
    Toolbar,
    saveDraftAction,
    publishAction,
    createBinding,
    autosave,
    localeSwitcher,
}: EditorFormToolbarProps) {
    const { createFormData } = useForm();

    const [isSaving, setIsSaving] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

    const saveActionRef = useRef(saveDraftAction);
    saveActionRef.current = saveDraftAction;
    const publishActionRef = useRef(publishAction);
    publishActionRef.current = publishAction;
    const createBindingRef = useRef(createBinding);
    createBindingRef.current = createBinding;
    const createFormDataRef = useRef(createFormData);
    createFormDataRef.current = createFormData;

    // /new/-page binding state: the id pinned after the first successful
    // create, and the single-flighted create promise saves coalesce onto while
    // the round-trip is in flight. Refs, not state — timers and click handlers
    // must read/write them synchronously to prevent a double create.
    const boundIdRef = useRef<string | null>(null);
    const pendingCreateRef = useRef<Promise<string> | null>(null);

    /**
     * Resolves the save target on /new/: returns the pinned id, coalesces onto
     * an in-flight create, or performs the create with this snapshot.
     * `createdNow` tells the caller the snapshot was already persisted by the
     * create itself (so a follow-up draft post would double-send it).
     *
     * @param binding - The page's create binding.
     * @param formData - The serialized form snapshot to create from.
     * @returns The bound id and whether this call performed the create.
     */
    const ensureCreated = useCallback(
        async (
            binding: EditorDocumentCreateBinding,
            formData: FormData,
        ): Promise<{ id: string; createdNow: boolean }> => {
            if (boundIdRef.current !== null) return { id: boundIdRef.current, createdNow: false };
            const pending = pendingCreateRef.current;
            if (pending !== null) return { id: await pending, createdNow: false };

            const creating = (async () => {
                const { id, editUrl } = await binding.create(formData);
                boundIdRef.current = id;
                // Shallow URL swap to the edit route: the mounted form keeps
                // its in-flight state, while a reload or shared link lands on
                // the real edit page for the now-existing document.
                window.history.replaceState(window.history.state, '', editUrl);
                return id;
            })();
            pendingCreateRef.current = creating;
            try {
                return { id: await creating, createdNow: true };
            } finally {
                // On failure this leaves both refs unset — never half-bound —
                // so the next save retries the create.
                pendingCreateRef.current = null;
            }
        },
        [],
    );

    /**
     * Posts a draft save through the pre-bound action, or — on /new/ —
     * through the create-then-bind dispatch.
     *
     * @param formData - The serialized form snapshot.
     */
    const postDraft = useCallback(
        async (formData: FormData): Promise<void> => {
            const binding = createBindingRef.current;
            if (binding === undefined) {
                await saveActionRef.current?.(formData);
                return;
            }
            const { id, createdNow } = await ensureCreated(binding, formData);
            if (!createdNow) await binding.saveDraftFor(id, formData);
        },
        [ensureCreated],
    );

    /**
     * Posts a publish through the pre-bound action, or — on /new/ — creates
     * the document first (when no save landed yet) and publishes the bound id,
     * so Publish on /new/ actually publishes instead of leaving a draft.
     *
     * @param formData - The serialized form snapshot.
     */
    const postPublish = useCallback(
        async (formData: FormData): Promise<void> => {
            const binding = createBindingRef.current;
            if (binding === undefined) {
                await publishActionRef.current?.(formData);
                return;
            }
            const { id } = await ensureCreated(binding, formData);
            await binding.publishFor(id, formData);
        },
        [ensureCreated],
    );

    // The `_payload` blob last round-tripped (autosave or explicit save). A
    // tick skips its save when the live blob is byte-identical, so an idle
    // form never re-posts. `null` until the mount effect seeds it from the
    // server baseline, so an untouched form's first ticks are no-ops.
    const lastSentRef = useRef<string | null>(null);
    const inFlightRef = useRef(false);

    // Seed the baseline from the initial server state so autosave only fires
    // once the user has actually diverged from it.
    useEffect(() => {
        if (lastSentRef.current !== null) return;
        void createFormDataRef.current().then((formData) => {
            if (lastSentRef.current === null) lastSentRef.current = String(formData.get('_payload'));
        });
    }, []);

    const runAutosave = useCallback(async () => {
        if (inFlightRef.current) return;
        const formData = await createFormDataRef.current();
        const blob = String(formData.get('_payload'));
        if (blob === lastSentRef.current) return;

        inFlightRef.current = true;
        setIsSaving(true);
        try {
            await postDraft(formData);
            lastSentRef.current = blob;
            setLastSavedAt(new Date());
        } catch (err) {
            // Autosave runs in the background; never surface failures as
            // "Uncaught (in promise)" — the user's explicit save action will
            // re-trigger and report any persistent errors inline. Because
            // `lastSentRef` does not advance, the next tick retries (on /new/
            // that means retrying the create itself).
            console.warn('[editor] autosave failed', err);
        } finally {
            inFlightRef.current = false;
            setIsSaving(false);
        }
    }, [postDraft]);

    const interval = autosave?.interval;
    useEffect(() => {
        if (interval === undefined) return;
        const id = setInterval(() => {
            void runAutosave();
        }, interval);
        return () => clearInterval(id);
    }, [interval, runAutosave]);

    const saveDraft = async (): Promise<void> => {
        const formData = await createFormData();
        await postDraft(formData);
        // An explicit save advances the autosave baseline too, so the next
        // tick does not redundantly re-post the just-saved blob.
        lastSentRef.current = String(formData.get('_payload'));
        setLastSavedAt(new Date());
    };

    const publish = async (): Promise<void> => {
        const formData = await createFormData();
        await postPublish(formData);
        lastSentRef.current = String(formData.get('_payload'));
        setLastSavedAt(new Date());
    };

    return (
        <>
            {localeSwitcher ? <div>{localeSwitcher}</div> : <div />}
            <Toolbar
                saveDraftAction={saveDraft}
                publishAction={publish}
                isSaving={isSaving}
                lastSavedAt={lastSavedAt}
                hasDrafts={!!autosave}
            />
        </>
    );
}
