// @vitest-environment happy-dom
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ArrayFieldDescriptor, FieldDescriptor } from '../../descriptors/types';
import { editorCollectionSchema } from '../collection-fields';
import { Form } from '../form/form';
import { useFormFields, useFormModified } from '../form/hooks';
import { buildInitialFormState, reduceFieldsToValues } from '../form/state';
import { EditorFields } from './editor-fields';

/**
 * Probe that exposes the live serialized document and the form-wide dirty
 * flag, so tests observe exactly what an edit through the native widgets
 * wrote into form state.
 */
function StateProbe() {
    const data = useFormFields(([fields]) => reduceFieldsToValues(fields));
    const modified = useFormModified();
    return (
        <span data-testid="state-probe" data-modified={String(modified)}>
            {JSON.stringify(data)}
        </span>
    );
}

/**
 * Read the {@link StateProbe} output from a render container.
 *
 * @param container - The render result root.
 * @returns The parsed document plus the dirty flag.
 */
function probe(container: HTMLElement): { data: Record<string, unknown>; modified: boolean } {
    const node = container.querySelector('[data-testid="state-probe"]');
    if (!node) throw new TypeError('no state probe in render');
    return {
        data: JSON.parse(node.textContent ?? '{}') as Record<string, unknown>,
        modified: node.getAttribute('data-modified') === 'true',
    };
}

/**
 * Find the control inside a widget's field shell by its dotted path, throwing
 * when missing so a failed dispatch reads as a loud failure.
 *
 * @param container - The render result root.
 * @param path - The field's dotted form-state path.
 * @param selector - CSS selector for the control inside the shell.
 * @returns The control element.
 */
function controlAt(container: HTMLElement, path: string, selector: string): HTMLElement {
    const shell = container.querySelector(`[data-testid="field-${path}"]`);
    if (!shell) throw new TypeError(`no field shell rendered for \`${path}\``);
    const control = shell.querySelector(selector);
    if (!control) throw new TypeError(`no \`${selector}\` control in \`${path}\` shell`);
    return control as HTMLElement;
}

/**
 * Render the native field surface for a collection inside the native `<Form>`,
 * seeded from a serialized document — the exact composition the edit page
 * mounts.
 *
 * @param collection - Collection slug for {@link EditorFields}.
 * @param data - The serialized document to seed form state from.
 * @param omitPaths - Optional named top-level fields to drop from the rendered tree.
 * @returns The render result.
 */
function renderSurface(collection: string, data: Record<string, unknown>, omitPaths?: string[]) {
    return render(
        <Form action={() => {}} initialState={buildInitialFormState(data)}>
            <EditorFields collection={collection} omitPaths={omitPaths} />
            <StateProbe />
        </Form>,
    );
}

describe('<EditorFields>', () => {
    it('edits a scalar field through the registry widget and flips the dirty flag', () => {
        const { container } = renderSurface('businessData', { legalName: 'Old Co' });

        expect(probe(container).modified).toBe(false);

        fireEvent.change(controlAt(container, 'legalName', 'input'), { target: { value: 'New Co' } });

        const { data, modified } = probe(container);
        expect(data.legalName).toBe('New Co');
        expect(modified).toBe(true);
    });

    it('edits a nested (depth >= 2) field inside a group and observes the state update', () => {
        const { container } = renderSurface('businessData', {
            legalName: 'Acme',
            address: { line1: '1 Main St', city: 'Oldtown' },
        });

        fireEvent.change(controlAt(container, 'address.city', 'input'), { target: { value: 'Newtown' } });

        const { data, modified } = probe(container);
        expect((data.address as Record<string, unknown>).city).toBe('Newtown');
        expect((data.address as Record<string, unknown>).line1).toBe('1 Main St');
        expect(modified).toBe(true);
    });

    it('edits a nested array-row field (footer sections) through the composite widgets', () => {
        const { container } = renderSurface('footer', {
            sections: [{ title: 'Shop' }],
        });

        fireEvent.change(controlAt(container, 'sections.0.title', 'input'), { target: { value: 'Support' } });

        const { data, modified } = probe(container);
        // `title` is a LOCALIZED leaf: the edit lands in the active locale's
        // bucket slot (the default `en-US` here), upgrading the legacy plain
        // value to bucket shape on first write.
        expect((data.sections as Array<Record<string, unknown>>)[0]?.title).toEqual({ 'en-US': 'Support' });
        expect(modified).toBe(true);
    });

    it('writes a localized leaf into the active locale slot, leaving the other locale intact', () => {
        const { container } = render(
            <Form
                action={() => {}}
                initialState={buildInitialFormState({
                    localeSwitcher: { enabled: true, label: { 'en-US': 'Region', 'de-DE': 'Region (DE)' } },
                })}
            >
                <EditorFields collection="header" locale="de-DE" defaultLocale="en-US" />
                <StateProbe />
            </Form>,
        );

        const input = controlAt(container, 'localeSwitcher.label', 'input') as HTMLInputElement;
        // The widget projects ONLY the active locale's slot — never locale A's value.
        expect(input.value).toBe('Region (DE)');

        fireEvent.change(input, { target: { value: 'Standort' } });

        const { data, modified } = probe(container);
        const switcher = data.localeSwitcher as Record<string, unknown>;
        expect(switcher.label).toEqual({ 'en-US': 'Region', 'de-DE': 'Standort' });
        expect(modified).toBe(true);
    });

    it('upgrades a legacy plain localized value to a bucket attributed to the tenant default', () => {
        const { container } = render(
            <Form
                action={() => {}}
                initialState={buildInitialFormState({
                    localeSwitcher: { enabled: true, label: 'Region' },
                })}
            >
                <EditorFields collection="header" locale="de-DE" defaultLocale="en-US" />
                <StateProbe />
            </Form>,
        );

        const input = controlAt(container, 'localeSwitcher.label', 'input') as HTMLInputElement;
        // Locale B starts empty — the legacy plain value belongs to the default locale.
        expect(input.value).toBe('');

        fireEvent.change(input, { target: { value: 'Standort' } });

        const switcher = probe(container).data.localeSwitcher as Record<string, unknown>;
        expect(switcher.label).toEqual({ 'en-US': 'Region', 'de-DE': 'Standort' });
    });

    it('renders the depth-6 header nav structure end to end (CMSGATE-01 prerequisite)', () => {
        // Build a nav doc nested the full six levels deep; every level carries
        // a `backgroundColor` leaf so the flattener emits a row at each depth.
        let level: Record<string, unknown> = { backgroundColor: '#06' };
        for (let depth = 5; depth >= 1; depth -= 1) {
            level = { backgroundColor: `#0${depth}`, items: [level] };
        }
        const { container } = renderSurface('header', { items: [level] });

        const deepest = `${Array.from({ length: 6 }, () => 'items.0').join('.')}.backgroundColor`;
        const input = controlAt(container, deepest, 'input');

        fireEvent.change(input, { target: { value: '#abcdef' } });
        const probeResult = probe(container);
        expect(JSON.stringify(probeResult.data)).toContain('#abcdef');
        expect(probeResult.modified).toBe(true);
    });

    it('drops omitPaths fields from the rendered tree while their form state stays live', () => {
        const { container } = renderSurface('businessData', { legalName: 'Acme', address: { city: 'Town' } }, [
            'address',
        ]);

        expect(container.querySelector('[data-testid="field-address.city"]')).toBeNull();
        // The omitted subtree's paths still serialize — another surface owns the UI.
        expect((probe(container).data.address as Record<string, unknown>).city).toBe('Town');
    });

    it('renders nothing for a collection without a registered schema', () => {
        const { container } = renderSurface('unknownSlug', {});
        expect(container.querySelectorAll('[data-testid^="field-"]')).toHaveLength(0);
    });

    it('renders upload and relationship widgets without host providers (degraded, not crashing)', () => {
        const { container } = renderSurface('articles', { title: 'Hello' });
        // `cover` is an upload field; the placeholder action keeps it rendered.
        expect(controlAt(container, 'cover', 'input[type="file"]')).toBeDefined();
    });
});

describe('editorCollectionSchema', () => {
    it('nests the header nav items array exactly six levels deep', () => {
        const schema = editorCollectionSchema('header');
        let cursor: FieldDescriptor | undefined = schema.fields.find((f) => 'name' in f && f.name === 'items');
        let depth = 0;
        while (cursor !== undefined && cursor.type === 'array') {
            depth += 1;
            const next: FieldDescriptor | undefined = (cursor as ArrayFieldDescriptor).fields.find(
                (f) => 'name' in f && f.name === 'items',
            );
            cursor = next;
        }
        expect(depth).toBe(6);
    });

    it('marks the content collections rich-text and the settings collections raw-JSON', () => {
        for (const content of ['pages', 'articles', 'productMetadata', 'collectionMetadata']) {
            expect(editorCollectionSchema(content).richText).toBe(true);
        }
        expect(editorCollectionSchema('feature-flags').richText).toBeUndefined();
    });

    it('configures the 2s autosave on every draft-bearing collection', () => {
        for (const slug of [
            'pages',
            'articles',
            'businessData',
            'footer',
            'header',
            'productMetadata',
            'collectionMetadata',
        ]) {
            expect(editorCollectionSchema(slug).drafts?.autosave?.interval).toBe(2000);
        }
        expect(editorCollectionSchema('shops').drafts).toBeUndefined();
    });
});
