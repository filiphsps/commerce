import { checkboxField, selectField, textField } from '../descriptors/builders';
import { overridable } from '../descriptors/overridable';
import type { OverridableFieldDescriptor } from '../descriptors/types';

/**
 * One configurable storefront component's store-wide default settings. Each setting is an
 * {@link OverridableFieldDescriptor} so the editor renders the inherit/override control and the
 * stored value omits inherited keys (the cascade falls through). `surfaces` lists the usage contexts
 * a component renders in when it has more than one presentation (e.g. the product card: collection /
 * search / recommendation); a component with a single presentation omits it.
 *
 * This is the non-block declaration path. Blocks declare their settings on their own descriptor
 * (Phase 2). Both feed the same Customization editor and storefront resolver.
 */
export type ComponentSettingsEntry = {
    /** Stable component id; also the manifest key (`extensions.<id>`). */
    id: string;
    /** Human label shown as the section heading. */
    label: string;
    /** Usage-context keys for multi-surface components, or absent for single-surface ones. */
    surfaces?: readonly string[];
    /** The component's overridable default settings, in render order. */
    settings: OverridableFieldDescriptor[];
};

const productCardSettings: OverridableFieldDescriptor[] = [
    overridable(
        selectField({
            name: 'ctaPlacement',
            label: 'CTA placement',
            options: [
                { label: 'Float pill', value: 'float-pill' },
                { label: 'Inline button', value: 'inline-button' },
            ],
        }),
    ),
    overridable(
        selectField({
            name: 'layout',
            label: 'Layout',
            options: [
                { label: 'Vertical', value: 'vertical' },
                { label: 'Horizontal', value: 'horizontal' },
            ],
        }),
    ),
    overridable(
        selectField({
            name: 'chrome',
            label: 'Chrome',
            options: [
                { label: 'Boxed', value: 'boxed' },
                { label: 'Frameless', value: 'frameless' },
            ],
        }),
    ),
    overridable(
        selectField({
            name: 'pickerPresentation',
            label: 'Variant picker',
            options: [
                { label: 'Auto', value: 'auto' },
                { label: 'Float', value: 'float' },
                { label: 'Sheet', value: 'sheet' },
                { label: 'Inline', value: 'inline' },
            ],
        }),
    ),
];

const buildNotifierSettings: OverridableFieldDescriptor[] = [
    overridable(checkboxField({ name: 'enabled', label: 'Enabled' }), { inheritedSourceLabel: 'Platform default' }),
    overridable(
        selectField({
            name: 'position',
            label: 'Position',
            options: [
                { label: 'Bottom', value: 'bottom' },
                { label: 'Top', value: 'top' },
            ],
        }),
        { inheritedSourceLabel: 'Platform default' },
    ),
    overridable(textField({ name: 'copy', label: 'Banner text' }), { inheritedSourceLabel: 'Localized default' }),
    overridable(checkboxField({ name: 'autoReload', label: 'Auto-reload on new build' }), {
        inheritedSourceLabel: 'Platform default',
    }),
    overridable(checkboxField({ name: 'dismissable', label: 'Allow dismissal' }), {
        inheritedSourceLabel: 'Platform default',
    }),
];

/**
 * Registry of configurable storefront components, in display order. The Customization editor renders
 * one section per entry; the storefront resolves each surface through `resolveExtensions` →
 * `resolveProductCardSurface`. New components append an entry here; nothing else changes.
 */
export const COMPONENT_SETTINGS: readonly ComponentSettingsEntry[] = [
    {
        id: 'productCard',
        label: 'Product card',
        surfaces: ['collection', 'search', 'recommendation'],
        settings: productCardSettings,
    },
    {
        id: 'buildNotifier',
        label: 'Build notifier',
        settings: buildNotifierSettings,
    },
];

/**
 * Looks up a component-settings entry by id.
 *
 * @param id - The component id (e.g. `'productCard'`).
 * @returns The matching entry, or `undefined`.
 */
export const componentSettingsById = (id: string): ComponentSettingsEntry | undefined =>
    COMPONENT_SETTINGS.find((entry) => entry.id === id);
