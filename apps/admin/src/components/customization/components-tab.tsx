'use client';

import {
    createFieldRegistry,
    type FieldRegistry,
    RenderFields,
    registerCompositeFieldWidgets,
    registerScalarFieldWidgets,
} from '@nordcom/commerce-cms/editor/form';
import { COMPONENT_SETTINGS, type ComponentSettingsEntry } from '@nordcom/commerce-cms/extensions';
import { useState } from 'react';
import { cn } from '@/utils/tailwind';

/**
 * One configurable component's section: a heading, a surface selector for multi-surface components,
 * and the component's overridable settings rendered through the shared field registry. Settings write
 * under `extensions.<id>.<surface>.<name>` (or `extensions.<id>.<name>` when the component has a single
 * presentation), the exact path the storefront resolver reads back.
 *
 * @param props.entry - The component-settings registry entry to render.
 * @param props.registry - The shared field registry carrying the scalar + composite (incl. overridable) widgets.
 * @returns The component section.
 */
function ComponentSection({ entry, registry }: { entry: ComponentSettingsEntry; registry: FieldRegistry }) {
    const surfaces = entry.surfaces ?? [];
    const [surface, setSurface] = useState(surfaces[0]);
    const parentPath = surface ? `extensions.${entry.id}.${surface}` : `extensions.${entry.id}`;

    return (
        <section aria-label={entry.label} className="rounded-xl border border-border">
            <header className="flex items-center justify-between gap-3 border-border border-b bg-card/30 px-4 py-3">
                <h3 className="font-bold text-base">{entry.label}</h3>
                <span className="font-mono text-muted-foreground text-xs">{entry.id}</span>
            </header>

            {surfaces.length > 0 ? (
                <div
                    role="group"
                    aria-label="Surface"
                    className="flex flex-wrap items-center gap-2 border-border border-b px-4 py-3"
                >
                    <span className="font-bold text-muted-foreground text-xs uppercase tracking-wide">Surface</span>
                    {surfaces.map((value) => (
                        <button
                            key={value}
                            type="button"
                            data-testid={`surface-${entry.id}-${value}`}
                            aria-pressed={value === surface}
                            onClick={() => setSurface(value)}
                            className={cn(
                                'cursor-pointer rounded-full border px-3 py-1 font-semibold text-xs capitalize transition-colors',
                                value === surface
                                    ? 'border-primary/50 bg-primary/15 text-foreground'
                                    : 'border-border bg-card/40 text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {value}
                        </button>
                    ))}
                </div>
            ) : null}

            <div className="flex flex-col gap-5 p-4">
                <RenderFields registry={registry} fields={entry.settings} parentPath={parentPath} />
            </div>
        </section>
    );
}

/**
 * Components tab of the Customization hub: store-wide default settings for configurable storefront
 * components, rendered from {@link COMPONENT_SETTINGS} through the shared CMS field registry. Mounts
 * inside the editor `<Form>` (as the hub's `fieldSurface`), so the inherit/override widgets read and
 * write the same form state the toolbar saves and publishes.
 *
 * @returns The Components tab panel.
 */
export function ComponentsTab() {
    const [registry] = useState<FieldRegistry>(() => {
        const next = createFieldRegistry();
        registerScalarFieldWidgets(next);
        registerCompositeFieldWidgets(next);
        return next;
    });

    return (
        <div className="flex flex-col gap-5 py-2">
            {COMPONENT_SETTINGS.map((entry) => (
                <ComponentSection key={entry.id} entry={entry} registry={registry} />
            ))}
        </div>
    );
}
