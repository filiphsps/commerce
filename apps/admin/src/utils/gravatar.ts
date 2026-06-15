import { createHash } from 'node:crypto';

/**
 * Options for {@link gravatarUrl}.
 */
export interface GravatarOptions {
    /** Requested square pixel size (Gravatar `s`). Defaults to 160. */
    size?: number;
    /** Fallback image style when the email has no Gravatar (Gravatar `d`). Defaults to `'mp'` (mystery-person). */
    defaultImage?: string;
}

/**
 * Derives the Gravatar image URL for an email address. ADMIN-ONLY: this is the operator avatar
 * source; the storefront's customer avatars are unaffected. Deterministic and storage-free — the URL
 * is a pure function of the normalized email — so it is always current and needs no migration of
 * stored avatars. Uses the SHA-256 address hash (Gravatar's recommended scheme) over the trimmed,
 * lowercased email.
 *
 * @param email - The operator's email address.
 * @param options - Optional size and default-image overrides.
 * @returns The Gravatar avatar URL.
 */
export function gravatarUrl(email: string, options: GravatarOptions = {}): string {
    const { size = 160, defaultImage = 'mp' } = options;
    const normalized = email.trim().toLowerCase();
    const hash = createHash('sha256').update(normalized).digest('hex');
    const params = new URLSearchParams({ d: defaultImage, s: String(size) });
    return `https://www.gravatar.com/avatar/${hash}?${params.toString()}`;
}
