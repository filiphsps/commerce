// @vitest-environment happy-dom
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@payloadcms/ui', () => ({
    useForm: () => ({ createFormData: async () => new FormData() }),
    useAllFormFields: () => [{}],
    useFormModified: () => false,
}));

import { EditorFormToolbar } from './editor-form-toolbar';

const Toolbar = vi.fn((props: { hasDrafts: boolean }) => (
    <div data-testid="t" data-has-drafts={String(props.hasDrafts)} />
));

describe('<EditorFormToolbar>', () => {
    it('passes hasDrafts=true when autosave is configured', () => {
        const { getByTestId } = render(
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
        const { getByTestId } = render(
            <EditorFormToolbar
                Toolbar={Toolbar as never}
                saveDraftAction={async () => {}}
                publishAction={async () => {}}
            />,
        );
        expect(getByTestId('t').dataset.hasDrafts).toBe('false');
    });

    it('renders the localeSwitcher slot to the left of the toolbar', () => {
        const { getByTestId } = render(
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
        const { queryByTestId } = render(
            <EditorFormToolbar
                Toolbar={Toolbar as never}
                saveDraftAction={async () => {}}
                publishAction={async () => {}}
            />,
        );
        expect(queryByTestId('switcher')).toBeNull();
    });
});
