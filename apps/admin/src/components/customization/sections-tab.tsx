'use client';

import { BLOCK_TYPES } from '@nordcom/commerce-cms/blocks';
import { checkboxField, type OverridableFieldDescriptor, overridable } from '@nordcom/commerce-cms/descriptors';
import {
    createFieldRegistry,
    type FieldRegistry,
    RenderFields,
    registerCompositeFieldWidgets,
    registerScalarFieldWidgets,
    useField,
} from '@nordcom/commerce-cms/editor/form';
import { CHROME_SLOT_IDS } from '@nordcom/commerce-cms/layout';
import { useState } from 'react';
import { cn } from '@/utils/tailwind';

/** `content` is the required body slot and is never toggleable; the rest can be shown/hidden. */
const TOGGLEABLE_SECTIONS = CHROME_SLOT_IDS.filter((id) => id !== 'content');

/**
 * Humanizes a slot/block id for display (`info-bar` → `Info bar`).
 *
 * @param id - The kebab-case id.
 * @returns The human label.
 */
function humanize(id: string): string {
    const spaced = id.replace(/-/g, ' ');
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** One overridable checkbox per toggleable section, written under `extensions.sections.<id>`. */
const sectionFields: OverridableFieldDescriptor[] = TOGGLEABLE_SECTIONS.map((id) =>
    overridable(checkboxField({ name: id, label: humanize(id) }), { inheritedSourceLabel: 'Shown by default' }),
);

/**
 * Block-availability control: which block types this shop can use, written to
 * `extensions.blocks.available`. Restricting a type both removes it from the editor's add menu and
 * stops already-placed instances of that type rendering on the storefront. Inherit (no value) →
 * every block is available; once the merchant unchecks one, the value becomes the explicit subset,
 * and re-checking all returns to inherit.
 *
 * @returns The block-availability checklist.
 */
function BlockAvailability() {
    const { value, setValue } = useField<string[] | undefined>({ path: 'extensions.blocks.available' });
    const available = value ?? [...BLOCK_TYPES];

    const toggle = (slug: string) => {
        const next = available.includes(slug) ? available.filter((s) => s !== slug) : [...available, slug];
        // Full set === inherit ("all available"); store the explicit subset otherwise.
        setValue(next.length === BLOCK_TYPES.length ? undefined : next);
    };

    return (
        <section aria-label="Block availability" className="rounded-xl border border-border">
            <header className="flex items-center justify-between gap-3 border-border border-b bg-card/30 px-4 py-3">
                <h3 className="font-bold text-base">Block availability</h3>
                <span className="font-mono text-muted-foreground text-xs">extensions.blocks.available</span>
            </header>
            <p className="px-4 pt-3 text-muted-foreground text-sm">
                Which block types this shop can use. Restricting a type removes it from the editor's add menu and hides
                instances already placed on pages. All types are available unless you restrict them.
            </p>
            <div className="flex flex-wrap gap-2 p-4">
                {BLOCK_TYPES.map((slug) => {
                    const on = available.includes(slug);
                    return (
                        <button
                            key={slug}
                            type="button"
                            data-testid={`block-available-${slug}`}
                            aria-pressed={on}
                            onClick={() => toggle(slug)}
                            className={cn(
                                'cursor-pointer rounded-full border px-3 py-1 font-semibold text-xs transition-colors',
                                on
                                    ? 'border-primary/50 bg-primary/15 text-foreground'
                                    : 'border-border bg-card/40 text-muted-foreground line-through hover:text-foreground',
                            )}
                        >
                            {slug}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}

/**
 * Sections tab of the Customization hub: storefront section visibility (shown/hidden per chrome slot)
 * and block availability. Section toggles are overridable — inherit defers to the platform/flag
 * default, override forces shown/hidden — written to `extensions.sections.<id>`. Mounts inside the
 * editor `<Form>`, so the toolbar saves and publishes these alongside the rest of the hub.
 *
 * @returns The Sections tab panel.
 */
export function SectionsTab() {
    const [registry] = useState<FieldRegistry>(() => {
        const next = createFieldRegistry();
        registerScalarFieldWidgets(next);
        registerCompositeFieldWidgets(next);
        return next;
    });

    return (
        <div className="flex flex-col gap-5 py-2">
            <section aria-label="Section visibility" className="rounded-xl border border-border">
                <header className="flex items-center justify-between gap-3 border-border border-b bg-card/30 px-4 py-3">
                    <h3 className="font-bold text-base">Section visibility</h3>
                    <span className="font-mono text-muted-foreground text-xs">extensions.sections</span>
                </header>
                <div className="flex flex-col gap-5 p-4">
                    <RenderFields registry={registry} fields={sectionFields} parentPath="extensions.sections" />
                </div>
            </section>
            <BlockAvailability />
        </div>
    );
}
