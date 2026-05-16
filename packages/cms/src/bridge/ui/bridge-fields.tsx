'use client';

import { RenderFields, useConfig } from '@payloadcms/ui';
import { BRIDGE_COLLECTION_PREFIX } from '../plugin';

export type BridgeFieldsProps = {
    /** Manifest slug — used to look up the synthesized `bridge:<slug>` collection. */
    slug: string;
};

export function BridgeFields({ slug }: BridgeFieldsProps) {
    const { getEntityConfig } = useConfig();
    const collectionSlug = `${BRIDGE_COLLECTION_PREFIX}${slug}`;
    const collectionConfig = getEntityConfig({ collectionSlug });
    const fields = collectionConfig?.fields ?? [];

    return (
        <RenderFields
            fields={fields}
            parentIndexPath=""
            parentPath=""
            parentSchemaPath={collectionSlug}
            permissions={true}
        />
    );
}
