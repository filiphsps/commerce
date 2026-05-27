/**
 * Pluggable persistence contract for the active cart's identifier.
 *
 * cart-next ships {@link httpOnlyCookieStorage} as the default Next.js
 * implementation; hosts on other transports (Redis, signed JWT, KV) can
 * supply their own implementation and pass it to the reader / ensurer /
 * typed-action factories.
 */
export interface CartIdStorage {
    /**
     * Reads the persisted cart id.
     *
     * @returns The stored cart id, or `null` when nothing is stored or the
     *   stored value fails validation (e.g. empty string, length cap).
     */
    get(): Promise<string | null>;

    /**
     * Persists a cart id, replacing any prior value.
     *
     * @param id - Cart id to store.
     */
    set(id: string): Promise<void>;

    /**
     * Removes the persisted cart id. Idempotent.
     */
    clear(): Promise<void>;
}
