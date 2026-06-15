'use client';

import { blocksWithSettings } from '@nordcom/commerce-cms/blocks';
import {
    createFieldRegistry,
    type FieldRegistry,
    RenderFields,
    registerCompositeFieldWidgets,
    registerScalarFieldWidgets,
} from '@nordcom/commerce-cms/editor/form';
import { useState } from 'react';

/**
 * Blocks tab of the Customization hub: store-wide default settings per block type, rendered from each
 * block's {@link BlockDescriptor.settings} through the shared CMS field registry. Each setting writes
 * under `extensions.blockDefaults.<slug>.<name>` — the path the storefront block component reads as
 * its store default. Mounts inside the editor `<Form>` (as part of the hub's `fieldSurface`), so the
 * inherit/override widgets share the form state the toolbar saves and publishes. Only blocks that
 * declare settings appear; a future custom block shows up automatically once it declares them.
 *
 * @returns The Blocks tab panel.
 */
export function BlocksTab() {
    const [registry] = useState<FieldRegistry>(() => {
        const next = createFieldRegistry();
        registerScalarFieldWidgets(next);
        registerCompositeFieldWidgets(next);
        return next;
    });

    const blocks = blocksWithSettings();
    if (blocks.length === 0) {
        return <p className="py-6 text-muted-foreground text-sm">No blocks expose store-wide settings yet.</p>;
    }

    return (
        <div className="flex flex-col gap-5 py-2">
            {blocks.map((descriptor) => (
                <section
                    key={descriptor.slug}
                    aria-label={descriptor.labels?.singular ?? descriptor.slug}
                    className="rounded-xl border border-border"
                >
                    <header className="flex items-center justify-between gap-3 border-border border-b bg-card/30 px-4 py-3">
                        <h3 className="font-bold text-base capitalize">
                            {descriptor.labels?.singular ?? descriptor.slug}
                        </h3>
                        <span className="font-mono text-muted-foreground text-xs">block:{descriptor.slug}</span>
                    </header>
                    <div className="flex flex-col gap-5 p-4">
                        <RenderFields
                            registry={registry}
                            fields={descriptor.settings ?? []}
                            parentPath={`extensions.blockDefaults.${descriptor.slug}`}
                        />
                    </div>
                </section>
            ))}
        </div>
    );
}
