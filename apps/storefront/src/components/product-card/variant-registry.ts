import { UnreachableError } from '@nordcom/commerce-errors';
import type { ComponentType } from 'react';

/**
 * A tenant-agnostic registry mapping a variant name to the React component that renders it.
 * The registry holds component types only — it never sees a product, locale, or any tenant
 * data; the storefront injects that data through props at the render boundary, so the
 * registry stays safe to share with CMS-side, data-free composition (the Block-loader firewall).
 *
 * @template Props - Props contract every component registered under this registry must accept.
 */
export type VariantRegistry<Props> = {
    register: (name: string, component: ComponentType<Props>) => void;
    resolve: (name: string) => ComponentType<Props>;
};

/**
 * Creates a name→component variant registry seeded with the given built-ins and exposes
 * `register` as the public extension API so a shop/extension can add or replace a variant
 * without a redeploy. `resolve` returns the matching component, falling back to the built-in
 * registered under `fallbackName` when the name is unknown — preserving the existing pickers'
 * and CTAs' "unknown selector still renders something" contract.
 *
 * @template Props - Props contract shared by every component in this registry.
 * @param label - Human-readable registry name used only in the unreachable-fallback message.
 * @param fallbackName - Built-in name returned when a lookup misses; must appear in `builtins`.
 * @param builtins - Seed entries registered at creation; the source of byte-identical defaults.
 * @returns A {@link VariantRegistry} whose `resolve` always returns a component for any name.
 * @throws {UnreachableError} From `resolve`, when `fallbackName` was never seeded in `builtins`
 *   (a construction-time programming error, since `register` only ever sets — never deletes — entries).
 */
export function createVariantRegistry<Props>(
    label: string,
    fallbackName: string,
    builtins: ReadonlyArray<readonly [name: string, component: ComponentType<Props>]>,
): VariantRegistry<Props> {
    const registry = new Map<string, ComponentType<Props>>(builtins);

    /**
     * Adds or replaces the component registered under `name`.
     *
     * @param name - Unique lookup key for the component.
     * @param component - Component to register under `name`.
     */
    const register = (name: string, component: ComponentType<Props>): void => {
        registry.set(name, component);
    };

    /**
     * Returns the component registered under `name`, or the `fallbackName` built-in when unknown.
     *
     * @param name - Lookup key of the desired component.
     * @returns The matching component, or the fallback built-in.
     * @throws {UnreachableError} When the fallback built-in is absent (see factory contract).
     */
    const resolve = (name: string): ComponentType<Props> => {
        const found = registry.get(name);
        if (found) return found;

        const fallback = registry.get(fallbackName);
        if (!fallback) {
            throw new UnreachableError(`${label} variant registry has no "${fallbackName}" fallback registered`);
        }
        return fallback;
    };

    return { register, resolve };
}
