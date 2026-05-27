import type { Access } from 'payload';

/**
 * Payload access predicate that allows unrestricted read access to any caller,
 * including unauthenticated requests. Use only on collections whose content is
 * intentionally public (e.g. published storefront content).
 *
 * @returns Always `true`.
 *
 * @example
 *   read: publicRead
 */
export const publicRead: Access = () => true;
