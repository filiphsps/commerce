import type { CollectionBeforeChangeHook, CollectionBeforeReadHook } from 'payload';

/**
 * The two masked commerce-provider secret paths, named once so the read-strip and write-reject
 * predicates (and the Convex-side `cms/secrets.ts` parity) agree on a single contract. They are
 * shredded off the public shop payload because they are credentials, never editor-editable content.
 */
export const SHOP_SECRET_PATHS = [
    'commerceProvider.authentication.token',
    'commerceProvider.authentication.customers.clientSecret',
] as const;

/**
 * The slice of a Payload `req` the secret predicates decide over: the principal's role and the
 * trusted server-context opt-out flag. The members are deliberately `object` rather than shaped:
 * `PayloadRequest['user']` is `UntypedUser` in compilations that don't load the generated payload
 * types (e.g. a sibling package building this file through project references), and an `UntypedUser`
 * shares no properties with a `{ role?: string }` weak type, so a shaped member fails to typecheck
 * exactly where the hooks pass `req` through. The predicates narrow the members internally instead.
 */
export type SecretAccessRequest = {
    user?: object | null;
    context?: object | null;
};

/**
 * Whether the caller may SEE the masked commerce-provider secrets on a read. Reproduces Payload's
 * `overrideAccess` semantics at the hook layer: the "enforce-in-editor" path exposes secrets only to
 * an `admin`, while the "bypass-in-sync" path lets a server-only trusted caller (e.g. the storefront's
 * `Shop.findByDomain({ sensitiveData: true })`) set `context.sensitiveShopRead` to bypass stripping.
 *
 * That context flag is set ONLY by server-side code, NEVER by a browser request, so a non-admin user
 * cannot flip it to exfiltrate secrets — it is the local-API `overrideAccess: true` analog for hooks,
 * which (unlike access functions) do not receive `overrideAccess` directly.
 *
 * @param req - The request slice to inspect.
 * @returns `true` for an admin or a trusted server-side sync; `false` otherwise.
 */
export function mayReadShopSecrets(req: SecretAccessRequest | undefined): boolean {
    const role = (req?.user as { role?: unknown } | null | undefined)?.role;
    if (role === 'admin') return true;
    const sensitiveShopRead = (req?.context as { sensitiveShopRead?: unknown } | null | undefined)?.sensitiveShopRead;
    return sensitiveShopRead === true;
}

/**
 * Whether the caller may WRITE the masked secrets. The "enforce-in-editor" arm of `overrideAccess`:
 * only an `admin` may change the secret paths; any other principal's attempt is reverted to the stored
 * value (see {@link rejectSecretWritesFromNonAdmins}). Secrets are otherwise written out-of-band
 * (env vars / dashboard sync), never through the editor.
 *
 * @param req - The request slice to inspect.
 * @returns `true` only for an admin principal.
 */
export function mayWriteShopSecrets(req: SecretAccessRequest | undefined): boolean {
    return (req?.user as { role?: unknown } | null | undefined)?.role === 'admin';
}

/**
 * Removes `token` and `customers.clientSecret` in place from a commerce-provider `authentication`
 * object. Shared by {@link stripSecretsOnRead} so the field-level masking lives in one tested place.
 *
 * @param authentication - The `commerceProvider.authentication` object to mask, if present.
 */
function deleteSecretFields(authentication: Record<string, unknown> | undefined): void {
    if (!authentication) return;
    delete authentication.token;
    const customers = authentication.customers as Record<string, unknown> | undefined;
    if (customers) delete customers.clientSecret;
}

/**
 * Reject writes to `commerceProvider.authentication.token` and
 * `commerceProvider.authentication.customers.clientSecret` from non-admins. Secret tokens are written
 * via an out-of-band process (env vars / Shopify dashboard sync), never through the editor: a
 * non-admin's attempted change is reverted to the stored value, so the write is a no-op.
 */
export const rejectSecretWritesFromNonAdmins: CollectionBeforeChangeHook = async ({ req, data, originalDoc }) => {
    if (mayWriteShopSecrets(req)) return data;
    const auth = (data as { commerceProvider?: { authentication?: Record<string, unknown> } }).commerceProvider
        ?.authentication;
    const origAuth = (originalDoc as { commerceProvider?: { authentication?: Record<string, unknown> } } | undefined)
        ?.commerceProvider?.authentication;
    if (auth && origAuth) {
        if ('token' in origAuth) auth.token = origAuth.token;
        const customers = (auth as { customers?: Record<string, unknown> }).customers;
        const origCustomers = (origAuth as { customers?: Record<string, unknown> }).customers;
        if (customers && origCustomers && 'clientSecret' in origCustomers) {
            customers.clientSecret = origCustomers.clientSecret;
        }
    }
    return data;
};

/**
 * Strip the same secret paths on read for non-admins so the browser-side state never contains them.
 *
 * Trusted server-side callers (e.g. the storefront's `Shop.findByDomain({ sensitiveData: true })`) opt
 * out by setting `req.context.sensitiveShopRead` — the {@link mayReadShopSecrets} "bypass-in-sync"
 * path. That flag is only set by server-only code paths, never by browser requests, so it can't be
 * used by non-admin users to bypass stripping.
 */
export const stripSecretsOnRead: CollectionBeforeReadHook = async ({ req, doc }) => {
    if (mayReadShopSecrets(req)) return doc;
    const d = doc as { commerceProvider?: { authentication?: Record<string, unknown> } };
    deleteSecretFields(d.commerceProvider?.authentication);
    return doc;
};
