import { MissingEnvironmentVariableError } from '@nordcom/commerce-errors';

/**
 * Returns the configured service domain from the `SERVICE_DOMAIN` environment variable.
 *
 * @returns The bare domain string (no scheme or trailing slash).
 * @throws {MissingEnvironmentVariableError} When `SERVICE_DOMAIN` is not set.
 */
export function getServiceDomain(): string {
    const domain = process.env.SERVICE_DOMAIN;
    if (!domain) {
        throw new MissingEnvironmentVariableError('SERVICE_DOMAIN');
    }
    return domain;
}

/**
 * Returns the fully-qualified HTTPS URL for the service.
 *
 * @returns URL string in the form `https://<SERVICE_DOMAIN>`.
 * @throws {MissingEnvironmentVariableError} When `SERVICE_DOMAIN` is not set.
 */
export function getServiceUrl(): string {
    return `https://${getServiceDomain()}`;
}

/**
 * Returns the admin sub-domain hostname derived from the service domain.
 *
 * @returns Hostname string in the form `admin.<SERVICE_DOMAIN>`.
 * @throws {MissingEnvironmentVariableError} When `SERVICE_DOMAIN` is not set.
 */
export function getAdminHostname(): string {
    return `admin.${getServiceDomain()}`;
}
