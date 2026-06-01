/**
 * Convex functions execute in the Convex isolate, which exposes the deployment's environment
 * variables on `process.env` at runtime — but this package's tsconfig deliberately ships no
 * `@types/node` (the functions target the Convex runtime, not Node, and the Convex-scaffolded
 * `convex/tsconfig.json` omits node types too). This module is the SINGLE, documented bridge over
 * that gap: a module-scoped ambient `process` declaration plus a typed accessor, so the rest of the
 * convex code reads deployment env vars type-safely without scattering a bare Node global — which
 * would fail to typecheck — across every file that needs one.
 */
declare const process: { readonly env: Record<string, string | undefined> };

/**
 * Reads a Convex deployment environment variable.
 *
 * @param name - The environment variable name.
 * @returns The trimmed value, or `undefined` when the variable is unset or empty.
 */
export function getServerEnv(name: string): string | undefined {
    const value = process.env[name];
    return value && value.length > 0 ? value : undefined;
}
