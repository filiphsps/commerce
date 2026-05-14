import 'server-only';
import { getClientConfig } from '@payloadcms/ui/utilities/getClientConfig';
import { cache } from 'react';
import { createLocalReq } from 'payload';
import { getAuthedPayloadCtx } from './payload-ctx';

export const getCmsClientConfig = cache(async (domain?: string) => {
    const { payload, user } = await getAuthedPayloadCtx(domain);
    const req = await createLocalReq({}, payload);
    return getClientConfig({
        config: payload.config,
        i18n: req.i18n,
        importMap: payload.importMap,
        user: user as never,
    });
});
