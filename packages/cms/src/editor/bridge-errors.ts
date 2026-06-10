/**
 * Stable error codes the editor shell branches on when a bridge read fails.
 * Mirrors of the Convex-side constants (`cms/list.ts`'s `CmsListErrorCode`,
 * `lib/scan_budget.ts`'s `ScanBudgetErrorCode`) — duplicated as literals
 * because Convex isolate modules are off this package's bundle surface; the
 * Convex test suites pin the source values, so a drift fails over there.
 */
export const EditorBridgeErrorCode = {
    /** A list page past the last addressable page was requested. */
    PAGE_OUT_OF_RANGE: 'CMS_LIST_PAGE_OUT_OF_RANGE',
    /** A tenant scan crossed the bounded read budget. */
    BOUNDED_SCAN_EXCEEDED: 'CMS_BOUNDED_SCAN_EXCEEDED',
} as const;

/**
 * Extract the stable `data.code` from a `ConvexError`-shaped value, without a
 * `convex` dependency: both the real client error and test substitutes carry
 * `{ data: { code } }`, so a structural read covers every transport.
 *
 * @param error - The thrown value from a bridge call.
 * @returns The stable code string, or `undefined` for non-Convex errors.
 */
export function bridgeErrorCode(error: unknown): string | undefined {
    if (typeof error !== 'object' || error === null) return undefined;
    const data = (error as { data?: unknown }).data;
    if (typeof data !== 'object' || data === null) return undefined;
    const code = (data as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
}
