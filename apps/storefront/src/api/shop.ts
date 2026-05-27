import 'server-only';

import { MissingEnvironmentVariableError } from '@nordcom/commerce-errors';

export type HexColor = `#${string}`;
export type Color = HexColor;

/**
 * Reads the `SERVICE_DOMAIN` environment variable.
 *
 * @returns The configured service domain string.
 * @throws {MissingEnvironmentVariableError} When `SERVICE_DOMAIN` is absent from the environment.
 */
export function getGlobalServiceDomain() {
    const token = process.env.SERVICE_DOMAIN;
    if (!token) {
        throw new MissingEnvironmentVariableError('SERVICE_DOMAIN');
    }

    return token;
}
