'use client';

import { useId, useState } from 'react';

import type { CollapsibleFieldDescriptor } from '../../../descriptors/types';
import { cn } from '../../../utils/tailwind';
import type { FieldRendererProps } from '../registry';
import { RenderFields } from '../registry';

/**
 * Presentational collapsible (accordion) container widget. Unlike a group, a
 * collapsible introduces no data key, so its `path` equals the enclosing
 * scope's `parentPath` and its children store values exactly as if they were
 * inline siblings — the collapsible only adds a toggleable visual section.
 *
 * Self-contained rather than reusing the admin `components/ui/accordion`: the
 * CMS package sits below the admin app in the dependency graph and cannot
 * import from it, and it pulls in neither `@radix-ui/react-accordion` nor
 * `lucide-react`, so the toggle and chevron are native markup. The collapsed
 * children stay mounted (hidden via `hidden`) so their form-state bindings and
 * in-flight edits survive a collapse/expand cycle.
 *
 * @param props.field - The collapsible descriptor, read for its `label` and nested `fields`.
 * @param props.path - The enclosing scope's dotted path; the children render under it unchanged.
 * @param props.registry - The registry used to dispatch the nested fields.
 * @returns The accordion section with a toggle header and its rendered children.
 */
export function CollapsibleField({ field, path, registry }: FieldRendererProps<CollapsibleFieldDescriptor>) {
    const [open, setOpen] = useState(true);
    const regionId = useId();

    return (
        <div data-testid={`collapsible-${field.label}`} className="rounded-md border border-border">
            <button
                type="button"
                aria-expanded={open}
                aria-controls={regionId}
                onClick={() => setOpen((value) => !value)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left font-medium text-foreground text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                {field.label}
                <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
                >
                    <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
            </button>
            <div id={regionId} hidden={!open} className="flex flex-col gap-3 px-3 pb-3">
                <RenderFields registry={registry} fields={field.fields} parentPath={path} />
            </div>
        </div>
    );
}
