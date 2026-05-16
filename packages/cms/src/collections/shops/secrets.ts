import type { CollectionBeforeChangeHook, CollectionBeforeReadHook } from 'payload';

/**
 * Reject writes to `commerceProvider.authentication.token` and
 * `commerceProvider.authentication.customers.clientSecret` from non-admins.
 * Secret tokens are written via an out-of-band process (env vars / Shopify
 * dashboard sync), never through the editor.
 */
export const rejectSecretWritesFromNonAdmins: CollectionBeforeChangeHook = async ({ req, data, originalDoc }) => {
    if (req.user?.role === 'admin') return data;
    const auth = (data as { commerceProvider?: { authentication?: Record<string, unknown> } }).commerceProvider
        ?.authentication;
    const origAuth = (originalDoc as { commerceProvider?: { authentication?: Record<string, unknown> } } | undefined)
        ?.commerceProvider?.authentication;
    if (auth && origAuth) {
        if ('token' in origAuth) auth['token'] = origAuth['token'];
        const customers = (auth as { customers?: Record<string, unknown> }).customers;
        const origCustomers = (origAuth as { customers?: Record<string, unknown> }).customers;
        if (customers && origCustomers && 'clientSecret' in origCustomers) {
            customers['clientSecret'] = origCustomers['clientSecret'];
        }
    }
    return data;
};

/**
 * Strip the same secret paths on read for non-admins so the browser-side state
 * never contains them.
 */
export const stripSecretsOnRead: CollectionBeforeReadHook = async ({ req, doc }) => {
    if (req.user?.role === 'admin') return doc;
    const d = doc as { commerceProvider?: { authentication?: Record<string, unknown> } };
    if (d.commerceProvider?.authentication) {
        const auth = d.commerceProvider.authentication;
        delete auth['token'];
        if ((auth as { customers?: Record<string, unknown> }).customers) {
            delete (auth as { customers: Record<string, unknown> }).customers['clientSecret'];
        }
    }
    return doc;
};
