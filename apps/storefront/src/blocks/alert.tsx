import type { JSX } from 'react';
import { Alert as AlertComponent } from '@/components/informational/alert';
import type { AlertBlockNode } from './types';

/**
 * Renders the CMS Alert block. Mirrors the old Prismic `Alert` slice —
 * delegates to the shared `Alert` informational component so styling stays
 * in sync with the rest of the storefront.
 *
 * The Payload schema's severity union (info/success/warning/error) is a
 * subset of `Alert`'s storefront-side union (which also has `callout`), so
 * a direct pass-through is type-safe.
 */
export const AlertBlock = ({ block }: { block: AlertBlockNode }): JSX.Element => {
    return (
        <AlertComponent severity={block.severity} data-block-type="alert">
            <strong className="block font-semibold">{block.title}</strong>
            {block.body ? <p className="text-sm leading-snug">{block.body}</p> : null}
        </AlertComponent>
    );
};

AlertBlock.displayName = 'Nordcom.Blocks.Alert';
