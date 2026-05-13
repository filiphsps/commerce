import { revalidateTag } from 'next/cache';
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, CollectionConfig } from 'payload';

type Doc = {
    id: string | number;
    slug?: string;
    shopifyHandle?: string;
    tenant?: string | { id: string };
};

const tenantId = (doc: Doc): string | undefined => {
    if (!doc.tenant) return undefined;
    return typeof doc.tenant === 'string' ? doc.tenant : doc.tenant.id;
};

const docKey = (doc: Doc): string => doc.slug ?? doc.shopifyHandle ?? String(doc.id);

const invalidate = (collection: string, doc: Doc): void => {
    const tid = tenantId(doc);
    if (!tid) return;
    revalidateTag(`cms.${tid}.${collection}.${docKey(doc)}`, 'max');
    revalidateTag(`cms.${tid}.${collection}`, 'max');
    revalidateTag(`cms.${tid}`, 'max');
};

export type RevalidateHookOptions = { collection: string };

export const buildRevalidateHooks = ({ collection }: RevalidateHookOptions): NonNullable<CollectionConfig['hooks']> => {
    const afterChange: CollectionAfterChangeHook = async ({ doc }) => {
        invalidate(collection, doc as Doc);
        return doc;
    };
    const afterDelete: CollectionAfterDeleteHook = async ({ doc }) => {
        invalidate(collection, doc as Doc);
    };
    return { afterChange: [afterChange], afterDelete: [afterDelete] };
};
