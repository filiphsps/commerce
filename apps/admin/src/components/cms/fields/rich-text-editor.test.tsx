import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fireEvent, render } from '@/utils/test/react';

/**
 * Shared Tiptap doubles. `vi.hoisted` makes them available to the hoisted `vi.mock` factories below
 * while staying reachable from the specs, so a test can drive the captured `onUpdate` and assert which
 * editor commands a toolbar click runs — without mounting a real ProseMirror view (unreliable under
 * happy-dom).
 */
const tiptap = vi.hoisted(() => {
    const run = vi.fn();
    const chain: Record<string, (...args: unknown[]) => unknown> = {};
    for (const command of [
        'focus',
        'toggleBold',
        'toggleItalic',
        'toggleUnderline',
        'toggleStrike',
        'toggleHeading',
        'toggleBulletList',
        'toggleOrderedList',
        'toggleBlockquote',
    ]) {
        chain[command] = vi.fn(() => chain);
    }
    chain.run = run;
    const editor = {
        isEditable: true,
        isActive: vi.fn(() => false),
        chain: vi.fn(() => chain),
        getJSON: vi.fn((): Record<string, unknown> => ({ type: 'doc', content: [] })),
        commands: { setContent: vi.fn() },
        setEditable: vi.fn(),
    };
    const captured: { config: { onUpdate?: (args: { editor: typeof editor }) => void } | null } = { config: null };
    return { run, chain, editor, captured };
});

vi.mock('@tiptap/starter-kit', () => ({ default: { configure: vi.fn(() => ({ name: 'starter-kit' })) } }));
vi.mock('@tiptap/react', () => ({
    useEditor: (config: { onUpdate?: (args: { editor: unknown }) => void }) => {
        tiptap.captured.config = config as never;
        return tiptap.editor;
    },
    EditorContent: ({ editor }: { editor: unknown }) => (
        <div data-testid="editor-content" data-has-editor={String(Boolean(editor))} />
    ),
}));

import { AdminRichTextEditor, toEditorDocument } from '@/components/cms/fields/rich-text-editor';

const EMPTY = { type: 'doc', content: [] };
const NON_EMPTY = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }] };

describe('toEditorDocument', () => {
    it('passes a ProseMirror document through untouched', () => {
        expect(toEditorDocument(NON_EMPTY)).toBe(NON_EMPTY);
    });

    it('converts a legacy Lexical body through the codec', () => {
        const lexical = {
            root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: 'legacy' }] }] },
        } as never;
        expect(toEditorDocument(lexical)).toEqual({
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'legacy' }] }],
        });
    });

    it('degrades an unconvertible Lexical body to the empty document instead of throwing', () => {
        const broken = { root: { children: [{ type: 'not-a-real-node' }] } } as never;
        expect(toEditorDocument(broken)).toEqual(EMPTY);
    });

    it('degrades arbitrary JSON to the empty document', () => {
        expect(toEditorDocument({ foo: 'bar' } as never)).toEqual(EMPTY);
        expect(toEditorDocument(undefined)).toEqual(EMPTY);
    });
});

describe('AdminRichTextEditor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        tiptap.editor.isEditable = true;
        tiptap.editor.getJSON.mockReturnValue({ type: 'doc', content: [] });
    });

    it('renders the formatting toolbar and the editor surface', () => {
        const { getByTestId } = render(<AdminRichTextEditor id="body" value={EMPTY} onChange={() => {}} />);
        expect(getByTestId('body-editor')).toBeInTheDocument();
        expect(getByTestId('body-bold')).toBeInTheDocument();
        expect(getByTestId('editor-content')).toHaveAttribute('data-has-editor', 'true');
    });

    it('runs the bold command when the bold button is clicked', () => {
        const { getByTestId } = render(<AdminRichTextEditor id="body" value={EMPTY} onChange={() => {}} />);
        fireEvent.click(getByTestId('body-bold'));
        expect(tiptap.editor.chain).toHaveBeenCalled();
        expect(tiptap.chain.toggleBold).toHaveBeenCalled();
        expect(tiptap.run).toHaveBeenCalled();
    });

    it('reports edited documents through onChange as the editor JSON', () => {
        const onChange = vi.fn();
        tiptap.editor.getJSON.mockReturnValue(NON_EMPTY);
        render(<AdminRichTextEditor id="body" value={EMPTY} onChange={onChange} />);
        tiptap.captured.config?.onUpdate?.({ editor: tiptap.editor });
        expect(onChange).toHaveBeenCalledWith(NON_EMPTY);
    });

    it('re-seeds the editor when the bound value changes externally', () => {
        const { rerender } = render(<AdminRichTextEditor id="body" value={EMPTY} onChange={() => {}} />);
        // Mount with an empty editor + empty value performs no re-seed.
        expect(tiptap.editor.commands.setContent).not.toHaveBeenCalled();
        rerender(<AdminRichTextEditor id="body" value={NON_EMPTY} onChange={() => {}} />);
        expect(tiptap.editor.commands.setContent).toHaveBeenCalledWith(NON_EMPTY, { emitUpdate: false });
    });
});
