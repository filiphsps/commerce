'use client';

import { type ChangeEvent, createContext, type ReactNode, useContext, useState } from 'react';

import type { JsonFieldDescriptor } from '../../../descriptors/types';
import { cn } from '../../../utils/tailwind';
import type { FieldRegistry, FieldRendererProps } from '../registry';
import { FieldShell, fieldControlClassName, useEditorField } from './field-shell';

/**
 * A ProseMirror/Tiptap document, serialized as JSON — the value a rich-text field stores in its
 * localized bucket now that Lexical authoring is dropped (CMSRICH-01). Kept structurally minimal
 * (`type` + optional `content`) because the widget round-trips the document verbatim; the concrete
 * node schema is the editor's concern, not the form engine's.
 */
export type ProseMirrorDoc = {
    /** The node type — `'doc'` at the document root. */
    type: string;
    /** The document's child nodes, opaque to the form engine. */
    content?: unknown[];
};

/**
 * The empty ProseMirror document a rich-text field falls back to before anything is authored, so the
 * editor always mounts against a valid root node rather than `undefined`.
 */
export const EMPTY_PROSE_MIRROR_DOC: ProseMirrorDoc = { type: 'doc', content: [] };

/**
 * Props the host-provided Tiptap editor receives from {@link RichTextField}. The editor renders the
 * live document for the bound localized bucket and reports edits back through `onChange`, which the
 * widget writes straight into form state.
 */
export type RichTextEditorProps = {
    /** The bound field's dotted form-state path; also the editor control's `id`. */
    id: string;
    /** The document currently in form state. */
    value: ProseMirrorDoc;
    /** Commit an edited document back into the localized bucket. */
    onChange: (doc: ProseMirrorDoc) => void;
    /** When `true`, the editor renders read-only. */
    disabled?: boolean;
};

/**
 * The seam the rich-text widget renders its editor through. The admin host wires the real Tiptap
 * editor — bound to the `@convex-dev/prosemirror-sync` sync endpoints via `useTiptapSync` — as this
 * component; the widget itself carries no `@tiptap`/`convex` dependency so it stays a pure, testable
 * Client Component. When no editor is provided the widget falls back to a JSON editor, so authoring
 * still persists ProseMirror JSON to the bucket.
 */
export type RichTextEditorComponent = (props: RichTextEditorProps) => ReactNode;

const RichTextEditorContext = createContext<RichTextEditorComponent | null>(null);

/**
 * Provide the Tiptap editor the {@link RichTextField} widgets beneath it render. Optional by design:
 * the rich-text widget degrades to a JSON editor when no provider wraps it, so a surface can author
 * ProseMirror JSON before the live collaborative editor is wired.
 *
 * @param props.editor - The editor component bound to the prosemirror-sync endpoints.
 * @param props.children - The subtree that may render rich-text widgets.
 * @returns The provider wrapping `children`.
 */
export function RichTextEditorProvider({ editor, children }: { editor: RichTextEditorComponent; children: ReactNode }) {
    return <RichTextEditorContext.Provider value={editor}>{children}</RichTextEditorContext.Provider>;
}

/**
 * Read the rich-text editor from the nearest {@link RichTextEditorProvider}, or `null` when none is
 * provided. Unlike the relationship/upload seams this never throws: the widget has a working JSON
 * fallback, so a missing provider degrades the editing UX rather than breaking the form.
 *
 * @returns The provided editor component, or `null`.
 */
export function useRichTextEditor(): RichTextEditorComponent | null {
    return useContext(RichTextEditorContext);
}

/**
 * Serializes a ProseMirror document to pretty-printed JSON for the fallback editor's textarea,
 * collapsing `undefined` to an empty string so an unauthored field starts blank.
 *
 * @param value - The document in form state, or `undefined`.
 * @returns The document as indented JSON, or `''` when absent.
 */
function stringifyProseMirrorDoc(value: ProseMirrorDoc | undefined): string {
    return value === undefined ? '' : JSON.stringify(value, null, 2);
}

/**
 * The JSON editor the rich-text widget falls back to when no Tiptap editor is provided. Edits are
 * parsed on every keystroke: valid JSON is committed to the localized bucket, invalid JSON surfaces
 * inline without clobbering the last good document (mirroring the scalar `JsonField`). It is what
 * keeps the widget authoring real ProseMirror JSON in tests and in hosts that have not yet wired the
 * collaborative editor.
 *
 * @param props - {@link RichTextEditorProps} for the bound field.
 * @returns The JSON textarea plus any parse-error message.
 */
function FallbackRichTextEditor({ id, value, onChange, disabled }: RichTextEditorProps) {
    const [text, setText] = useState(() => stringifyProseMirrorDoc(value));
    const [parseError, setParseError] = useState<string | undefined>(undefined);

    const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        const raw = event.target.value;
        setText(raw);
        if (raw.trim() === '') {
            setParseError(undefined);
            onChange(EMPTY_PROSE_MIRROR_DOC);
            return;
        }
        try {
            const parsed = JSON.parse(raw) as ProseMirrorDoc;
            setParseError(undefined);
            onChange(parsed);
        } catch (cause) {
            setParseError(cause instanceof Error ? cause.message : 'Invalid JSON.');
        }
    };

    return (
        <>
            <textarea
                id={id}
                value={text}
                disabled={disabled}
                onChange={handleChange}
                className={cn(fieldControlClassName, 'min-h-24 font-mono')}
            />
            {parseError ? (
                <p role="alert" className="text-red-600 text-xs">
                    {parseError}
                </p>
            ) : null}
        </>
    );
}

/**
 * Rich-text field widget (CMSRICH-01). Binds a localized bucket to a ProseMirror/Tiptap document:
 * the host's Tiptap editor — wired to the prosemirror-sync endpoints through
 * {@link RichTextEditorProvider} — edits the document and the widget writes the serialized JSON
 * straight into form state, so the field persists ProseMirror JSON exactly as the scalar widgets
 * persist their values. Without a provider it degrades to {@link FallbackRichTextEditor}. Registered
 * for the `json` descriptor kind, which is how the rich-text body and the four `richText` fields are
 * modeled until a dedicated descriptor kind lands. Condition-gated like every leaf widget: a hidden
 * field is pruned from the `_payload` blob.
 *
 * @param props.field - The descriptor whose value is the ProseMirror document.
 * @param props.path - The field's dotted form-state path.
 * @returns The labeled editor, or `null` when its condition hides it.
 */
export function RichTextField({ field, path }: FieldRendererProps<JsonFieldDescriptor>) {
    const { value, setValue, visible, error } = useEditorField<ProseMirrorDoc>(field, path);
    const editor = useRichTextEditor();
    if (!visible) return null;

    const doc = value ?? EMPTY_PROSE_MIRROR_DOC;
    const Editor = editor ?? FallbackRichTextEditor;

    return (
        <FieldShell htmlFor={path} label={field.label ?? field.name} required={field.required} errorMessage={error}>
            <Editor id={path} value={doc} onChange={setValue} />
        </FieldShell>
    );
}

/**
 * Register the rich-text widget into a field registry. It claims the `json` descriptor kind — the kind
 * the rich-text body and `richText` fields are modeled as — so a content-editing surface opts into
 * rich-text authoring over the raw `JsonField` by calling this AFTER the scalar widgets (registration
 * is last-write-wins). Kept a separate registrar because the widget targets the content surfaces, not
 * the settings surfaces where a raw JSON editor is still wanted. Returns the registry for chaining.
 *
 * @param registry - The registry to populate.
 * @returns The registry, with the rich-text widget registered for `json`.
 */
export function registerRichTextFieldWidget(registry: FieldRegistry): FieldRegistry {
    registry.register('json', RichTextField);
    return registry;
}
