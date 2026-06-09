// @vitest-environment happy-dom
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Form } from '../form';
import { EditorFormToolbar } from './editor-form-toolbar';

const Toolbar = vi.fn((props: { hasDrafts: boolean }) => (
    <div data-testid="t" data-has-drafts={String(props.hasDrafts)} />
));

/**
 * Renders the toolbar inside the REAL native `<Form>` — the context it reads
 * `useForm`/`useFormModified` from since the CMSDATA-06 rewire off
 * `@payloadcms/ui`.
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
