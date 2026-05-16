import 'server-only';

/**
 * Hash (visitorId, flagKey) to a stable bucket in [0, 100).
 * Uses FNV-1a 32-bit — fast, no crypto dep, deterministic across runtimes.
 * The flag key is folded into the hash so two flags at the same bucket size
 * don't co-target the same visitor subset.
 */
export function hashToBucket(visitorId: string, flagKey: string): number {
    const input = `${flagKey}:${visitorId}`;
    let hash = 0x811c_9dc5;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 0x0100_0193);
    }
    return (hash >>> 0) % 100;
}
