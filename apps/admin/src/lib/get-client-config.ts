import 'server-only';
import { getClientConfig } from '@payloadcms/ui/utilities/getClientConfig';
import { headers as getHeaders } from 'next/headers';
import type { PayloadRequest } from 'payload';
import { createLocalReq, getLocalI18n, getRequestLanguage } from 'payload';
import { parseCookies } from 'payload/shared';
import { cache } from 'react';
import { getAuthedPayloadCtx } from './payload-ctx';

/**
 * Build the Payload `ClientConfig` for the current request and cache it per
 * render. The result is the serialised, browser-safe slice of the Payload
 * config that `@payloadcms/ui`'s field components need to render
 * (collection schemas, field metadata, translated labels, etc.).
 *
 * Pass `domain` from tenant-scoped routes (e.g. `[domain]/content/...`) so
 * the underlying `getAuthedPayloadCtx` call resolves the tenant and gates
 * access against it. Omitting `domain` returns a *cross-tenant* config and
 * is only appropriate for admin-only routes that legitimately operate
 * outside a single tenant (e.g. `/tenants`, `/users` in Phase 4). There is
 * no runtime warning if you forget to pass `domain` — be deliberate.
 *
 * The language used for translated labels is resolved from the request's
 * `Accept-Language` header and Payload's language cookie via
 * `getRequestLanguage`, matching what `@payloadcms/next`'s own admin shell
 * does in `initReq`.
 */
export const getCmsClientConfig = cache(async (domain?: string) => {
    const { payload, user } = await getAuthedPayloadCtx(domain);

    // Mirror @payloadcms/next's initReq: derive the request language from
    // headers + cookies (Accept-Language + payload-language cookie), then
    // initialise i18n for that language. Without this, createLocalReq falls
    // back to config.i18n.fallbackLanguage ('en' by default) and every
    // label/error rendered by @payloadcms/ui downstream would be English
    // regardless of the user's preference.
    const headers = await getHeaders();
    const cookies = parseCookies(headers);
    const language = getRequestLanguage({ config: payload.config, cookies, headers });
    // `getLocalI18n` returns the broader `I18n` type; `req.i18n` (and
    // `CreateClientConfigArgs.i18n`) are typed `I18nClient`. They are the
    // same object at runtime — `@payloadcms/next` does the same dance
    // internally — so narrow with a cast at the boundary.
    const i18n = (await getLocalI18n({ config: payload.config, language })) as PayloadRequest['i18n'];
    const req = await createLocalReq({ req: { i18n } }, payload);

    return getClientConfig({
        config: payload.config,
        i18n: req.i18n,
        importMap: payload.importMap,
        // `user` is `true | TypedUser` in CreateClientConfigArgs. Our
        // hand-built user object is structurally compatible at runtime
        // (getClientConfig only checks truthiness to decide whether to
        // emit an unauthenticated config), but TS can't verify it until
        // `payload generate:types` has emitted a real TypedUser. Drop
        // the cast once that lands.
        user: user as never,
    });
});
