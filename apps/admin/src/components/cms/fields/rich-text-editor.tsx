'use client';

import type { ProseMirrorDoc, RichTextEditorProps } from '@nordcom/commerce-cms/editor/form';
import { type LexicalDocument, lexicalToProseMirror } from '@nordcom/commerce-cms/editor/richtext';
import { type Content, type Editor, EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { type ReactNode, useEffect, useRef } from 'react';

import { cn } from '@/utils/tailwind';

/**
 * The empty ProseMirror document the editor mounts against before anything is authored, and the safe
 * fallback for a body that is not renderable prose — kept local so the editor never depends on the
 * value-binding of the library's exported constant.
 */
const EMPTY_DOCUMENT: ProseMirrorDoc = { type: 'doc', content: [] };

/**
 * The StarterKit set the codec (CMSRICH-04) targets: paragraph/heading/lists/blockquote/hardBreak/
 * horizontalRule nodes plus bold/italic/strike/underline/code marks, with the Link mark configured
 * non-clicking (a click inside the editor selects, never navigates). Pinned to the exact node/mark
 * surface the storefront renderer (`rich-text-renderer.tsx`) and the Lexical→ProseMirror codec agree
 * on, so a document round-trips through editor → form state → storefront without gaining a node the
 * renderer can't draw.
 */
const editorExtensions = [StarterKit.configure({ link: { openOnClick: false, autolink: true } })];

/**
 * Narrows an arbitrary stored body to the ProseMirror document Tiptap can mount, converting a legacy
 * Payload/Lexical body (`{ root: { children } }`) through the codec on the way. A value that is neither
 * a ProseMirror `doc` nor a convertible Lexical document — or one that trips the codec on an
 * unconvertible node — degrades to the empty document instead of throwing, so a malformed or
 * pre-migration body opens an empty editor rather than crashing the page (and never leaks raw JSON into
 * a contenteditable).
 *
 * @param value - The body currently in form state (ProseMirror doc, legacy Lexical doc, or junk).
 * @returns A ProseMirror document safe to hand Tiptap's `setContent`.
 */
export function toEditorDocument(value: ProseMirrorDoc | undefined): ProseMirrorDoc {
    if (value && typeof value === 'object') {
        if (value.type === 'doc') return value;
        if ('root' in value) {
            try {
                return lexicalToProseMirror(value as unknown as LexicalDocument);
            } catch {
                return EMPTY_DOCUMENT;
            }
        }
    }
    return EMPTY_DOCUMENT;
}

/**
 * One toolbar button. A controlled `aria-pressed` toggle styled with the admin field chrome, disabled
 * with the editor so a read-only surface offers no inert affordances.
 *
 * @param props.label - Accessible label and visible glyph.
 * @param props.active - Whether the command is active at the current selection.
 * @param props.disabled - Whether the control is inert (editor read-only or not ready).
 * @param props.onClick - Runs the command.
 * @param props.testId - Stable test id for the e2e harness.
 * @returns The toolbar button.
 */
function ToolbarButton({
    label,
    active,
    disabled,
    onClick,
    testId,
}: {
    label: string;
    active: boolean;
    disabled: boolean;
    onClick: () => void;
    testId: string;
}): ReactNode {
    return (
        <button
            type="button"
            data-testid={testId}
            aria-label={label}
            aria-pressed={active}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClick}
            className={cn(
                'inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-border px-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                active ? 'border-primary bg-primary/15 text-foreground' : 'bg-background hover:bg-muted',
            )}
        >
            {label}
        </button>
    );
}

/**
 * The toolbar's formatting controls, bound to the live editor so each button reflects (and toggles)
 * the mark/node active at the current selection.
 *
 * @param props.editor - The mounted Tiptap editor, or `null` before it initializes.
 * @param props.id - The bound field's dotted path, used to namespace the control test ids.
 * @returns The formatting toolbar.
 */
function Toolbar({ editor, id }: { editor: Editor | null; id: string }): ReactNode {
    const disabled = !editor?.isEditable;
    return (
        <div className="flex flex-wrap items-center gap-1 border-border border-b bg-muted/30 p-1.5">
            <ToolbarButton
                label="B"
                testId={`${id}-bold`}
                active={editor?.isActive('bold') ?? false}
                disabled={disabled}
                onClick={() => editor?.chain().focus().toggleBold().run()}
            />
            <ToolbarButton
                label="I"
                testId={`${id}-italic`}
                active={editor?.isActive('italic') ?? false}
                disabled={disabled}
                onClick={() => editor?.chain().focus().toggleItalic().run()}
            />
            <ToolbarButton
                label="U"
                testId={`${id}-underline`}
                active={editor?.isActive('underline') ?? false}
                disabled={disabled}
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
            />
            <ToolbarButton
                label="S"
                testId={`${id}-strike`}
                active={editor?.isActive('strike') ?? false}
                disabled={disabled}
                onClick={() => editor?.chain().focus().toggleStrike().run()}
            />
            <ToolbarButton
                label="H2"
                testId={`${id}-h2`}
                active={editor?.isActive('heading', { level: 2 }) ?? false}
                disabled={disabled}
                onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            />
            <ToolbarButton
                label="H3"
                testId={`${id}-h3`}
                active={editor?.isActive('heading', { level: 3 }) ?? false}
                disabled={disabled}
                onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            />
            <ToolbarButton
                label="• List"
                testId={`${id}-bullet-list`}
                active={editor?.isActive('bulletList') ?? false}
                disabled={disabled}
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
            />
            <ToolbarButton
                label="1. List"
                testId={`${id}-ordered-list`}
                active={editor?.isActive('orderedList') ?? false}
                disabled={disabled}
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            />
            <ToolbarButton
                label="❝"
                testId={`${id}-blockquote`}
                active={editor?.isActive('blockquote') ?? false}
                disabled={disabled}
                onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            />
        </div>
    );
}

/**
 * The admin's WYSIWYG rich-text editor — the real Tiptap editor wired into the CMSRICH-01
 * {@link RichTextEditorProvider} seam, replacing the library's raw-JSON fallback so content authors
 * edit structured prose (the document's paragraphs, headings, and lists as editable blocks) instead of
 * hand-editing a ProseMirror JSON blob. It reads/writes the SAME ProseMirror document the field's
 * localized bucket persists: edits flow out through `onChange(editor.getJSON())` into form state, where
 * the existing 2s autosave carries them to Convex exactly as the fallback did.
 *
 * External value changes (an autosave-driven server refresh, or a locale switch swapping the bound
 * bucket slot) re-seed the editor through `setContent`; an `emitUpdate: false` write plus the
 * `internalEdit` guard keeps the editor's own keystrokes from re-seeding mid-type and stealing the
 * caret. A legacy Lexical body is converted on mount via {@link toEditorDocument} so pre-migration
 * content opens as editable prose, not raw JSON.
 *
 * @param props.id - The bound field's dotted path; the editor control's id and test-id namespace.
 * @param props.value - The ProseMirror document currently in form state.
 * @param props.onChange - Commits an edited document back into the localized bucket.
 * @param props.disabled - When `true`, renders the editor read-only.
 * @returns The toolbar plus the editable surface.
 */
export function AdminRichTextEditor({ id, value, onChange, disabled }: RichTextEditorProps): ReactNode {
    // Set by our own `onUpdate` so the value-sync effect below can tell an edit we just emitted from a
    // genuinely external change — only the latter re-seeds the editor.
    const internalEdit = useRef(false);

    const editor = useEditor({
        immediatelyRender: false,
        editable: !disabled,
        extensions: editorExtensions,
        content: toEditorDocument(value) as Content,
        editorProps: {
            attributes: {
                id,
                'data-testid': `${id}-input`,
                class: 'prose prose-sm dark:prose-invert min-h-24 max-w-none px-3 py-2 outline-none',
            },
        },
        onUpdate: ({ editor: instance }) => {
            internalEdit.current = true;
            onChange(instance.getJSON() as ProseMirrorDoc);
        },
    });

    useEffect(() => {
        if (!editor) return;
        if (internalEdit.current) {
            internalEdit.current = false;
            return;
        }
        const incoming = toEditorDocument(value);
        if (JSON.stringify(incoming) === JSON.stringify(editor.getJSON())) return;
        editor.commands.setContent(incoming as Content, { emitUpdate: false });
    }, [editor, value]);

    useEffect(() => {
        editor?.setEditable(!disabled);
    }, [editor, disabled]);

    if (!editor) return null;

    return (
        <div
            data-testid={`${id}-editor`}
            className="overflow-hidden rounded-md border-2 border-border bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-ring"
        >
            <Toolbar editor={editor} id={id} />
            <EditorContent editor={editor} />
        </div>
    );
}
