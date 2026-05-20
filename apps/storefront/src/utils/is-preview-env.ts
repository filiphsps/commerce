import { isDevHost } from '@nordcom/commerce-utils';
import { BuildConfig } from '@/utils/build-config';

/**
 * Detect whether the current execution is happening in a non-production
 * environment (development, test, staging/beta subdomain, or portless dev TLD).
 *
 * @param hostname - The hostname to check.
 * @returns `null` if hostname is missing or invalid, `true` if the env or
 *   hostname indicates preview/dev, otherwise `false`.
 */
export function isPreviewEnv(hostname?: string): boolean | null {
    if (['development', 'test'].includes(BuildConfig.environment)) {
        return true;
    }

    if (!hostname || typeof hostname !== 'string' || hostname.length <= 0) {
        return null;
    }

    const lower = hostname.toLowerCase();
    if (['staging', 'preview', 'beta'].some((sub) => lower.startsWith(`${sub}.`))) {
        return true;
    }

    return isDevHost(lower);
}
