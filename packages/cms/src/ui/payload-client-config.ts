/**
 * Temporary CMSDATA-06 adapter: re-exports Payload's `getClientConfig` so the
 * admin's DI modules (`apps/admin/src/lib/get-cms-shell-props.ts`) can keep
 * serving the Payload-shaped shell prop bag to not-yet-rebuilt shell pages
 * WITHOUT importing `@payloadcms/ui` themselves. The Payload coupling is
 * quarantined in this package's `ui` module — the same module that owns
 * `<PayloadFieldShell>` — and both are deleted together by the CMSDATA-07
 * shell rebind.
 */
export { getClientConfig as buildPayloadClientConfig } from '@payloadcms/ui/utilities/getClientConfig';
