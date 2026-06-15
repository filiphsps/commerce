import type { JSX } from 'react';
import { Alert as AlertComponent } from '@/components/informational/alert';
import { type BlockContext, cmsFieldAttrs } from './context';
import type { AlertBlockNode } from './types';

/**
 * Renders the CMS Alert block. Mirrors the old Prismic `Alert` slice —
 * delegates to the shared `Alert` informational component so styling stays
 * in sync with the rest of the storefront.
 *
 * The Payload schema's severity union (info/success/warning/error) is a
 * subset of `Alert`'s storefront-side union (which also has `callout`), so
 * a direct pass-through is type-safe.
 *
 * @param block - The CMS alert block node (severity, title, body).
 * @param context - Render context; carries the preview flag that enables `data-cms-field` hints.
 * @param index - The block's position in the top-level blocks array, for the preview field path.
 * @returns The rendered alert element.
 */
export const AlertBlock = ({
    block,
    context,
    index,
}: {
    block: AlertBlockNode;
    context: BlockContext;
    index: number;
}): JSX.Element => {
    return (
        <AlertComponent severity={block.severity} data-block-type="alert">
            <strong className="block font-semibold" {...cmsFieldAttrs(context, index, 'title')}>
                {block.title}
            </strong>
            {block.body ? (
                <p className="text-sm leading-snug" {...cmsFieldAttrs(context, index, 'body')}>
                    {block.body}
                </p>
            ) : null}
        </AlertComponent>
    );
};

AlertBlock.displayName = 'Nordcom.Blocks.Alert';

/**
 * Loading placeholder for the Alert block. Mirrors the live block's
 * footprint — same severity tinting, same title+body slot count — so the
 * page doesn't shift when the real content streams in.
 *
 * The skeleton intentionally receives the block node (not just generic
 * dimensions) so it can size correctly when called from
 * `Blocks.Skeleton`, where the dispatcher already knows the schema.
 */
const AlertBlockSkeleton = ({ block }: { block: AlertBlockNode }): JSX.Element => {
    return (
        <AlertComponent severity={block.severity} data-block-type="alert" data-skeleton-variant="alert">
            <div className="flex w-full flex-col gap-2">
                <div className="h-4 w-32 rounded-sm" data-skeleton />
                {block.body ? <div className="h-3 w-full max-w-prose rounded-sm" data-skeleton /> : null}
            </div>
        </AlertComponent>
    );
};
AlertBlockSkeleton.displayName = 'Nordcom.Blocks.Alert.Skeleton';
AlertBlock.Skeleton = AlertBlockSkeleton;
