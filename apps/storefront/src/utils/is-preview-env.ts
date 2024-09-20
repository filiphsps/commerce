import { BuildConfig } from '@/utils/build-config';

/**
 * Check if an user agent is some form of a web crawler.
 * @param {string} hostname - The hostname to check.
 * @returns {boolean | null} `null` if the hostname is not provided, is empty, or is invalid, `true` if hostname is a preview environment, otherwise `false`.
 */
export function isPreviewEnv(hostname?: string): boolean | null {
    if (['development', 'test'].includes(BuildConfig.environment)) {
        return true;
    }

    if (!hostname || typeof hostname !== 'string' || hostname.length <= 0) {
        return null;
    }

    hostname = hostname.toLowerCase();
    if (
        ['staging', 'preview', 'beta'].some((sub) => hostname.startsWith(`${sub}.`)) ||
        hostname.includes('localhost')
    ) {
        return true;
    }

    return false;
}
