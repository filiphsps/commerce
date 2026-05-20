import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import { flag } from 'flags/next';

import { nordcomFlagAdapter } from './adapter';
import { evaluateShopFlagSync } from './evaluate-sync';

/**
 * Local `label`-required option type. Tightens the SDK's `flags` `FlagOption<T>`
 * (where `label` is optional) — every declared flag in this codebase ships an
 * admin-facing label, so we enforce it at declaration time instead of relying
 * on convention. Update if a label-less option ever becomes a legitimate case.
 */
export interface FlagOption<T> {
    label: string;
    value: T;
}

export interface FlagDefinition<T> {
    key: string;
    description: string;
    defaultValue: T;
    options: Array<FlagOption<T>>;
}

export interface DefinedFlag<T> {
    /**
     * Async call form. Use OUTSIDE `'use cache'` scopes.
     *
     * Reads `vercel-flag-overrides` cookie (toolbar overrides apply),
     * runs `identify` to build session/user entities, walks targeting rules.
     */
    (): Promise<T>;
    /**
     * Sync cache-safe form. Use INSIDE `'use cache'` scopes.
     *
     * Trade-offs (physics of cacheComponents — no cookies/headers in cached scope):
     *  - Toolbar overrides are NOT applied.
     *  - Predicates with `requiresUser: true` (`authenticated`, `group`) are skipped.
     *  - `visitorId` is empty → percentage rollouts bucket deterministically.
     *
     * If your flag truly needs user-scoped targeting or true percentage rollout,
     * move its consumer out of the cached subtree and use the async call form.
     */
    evaluate(shop: OnlineShop): T;
    readonly key: string;
    readonly defaultValue: T;
}

/**
 * Single declaration source for a feature flag.
 *
 * Produces both the SDK-style async callable (for dynamic call sites) and a
 * sync `.evaluate(shop)` method (for cache-safe call sites). Both paths walk
 * the same MongoDB-backed targeting rules; the async path additionally consults
 * the toolbar overrides cookie.
 */
export function defineFlag<T>(config: FlagDefinition<T>): DefinedFlag<T> {
    const flagConfig = {
        key: config.key,
        description: config.description,
        defaultValue: config.defaultValue,
        options: config.options,
        adapter: nordcomFlagAdapter<T>(),
    } as Parameters<typeof flag<T>>[0];
    const sdkFlag = flag<T>(flagConfig);
    const evaluate = (shop: OnlineShop): T => evaluateShopFlagSync<T>(shop, config.key, config.defaultValue);
    return Object.assign(sdkFlag, {
        evaluate,
        key: sdkFlag.key,
        defaultValue: sdkFlag.defaultValue,
    }) as unknown as DefinedFlag<T>;
}
