'use client';

import { createContext, type ReactNode, useContext } from 'react';

import type { FieldRegistry } from './registry';

/**
 * A host-supplied registration pass applied to an editor surface's field
 * registry AFTER the built-in widgets. Registration is last-write-wins (see
 * {@link createFieldRegistry}), so an extension overrides a built-in renderer
 * for the kinds it touches and leaves the rest intact.
 */
export type FieldWidgetExtension = (registry: FieldRegistry) => void;

/**
 * Carries a {@link FieldWidgetExtension} from a host (the admin app) down to the
 * library-agnostic `<EditorFields>` without that package depending on the host's
 * component library. The extension can't ride a prop: `<EditorFields>` is
 * instantiated by a Server Component (the edit page), and a function is not a
 * serializable RSC prop — so it travels through this CLIENT context instead,
 * mounted by the host's own client form shell.
 */
const FieldWidgetsContext = createContext<FieldWidgetExtension | null>(null);

/**
 * Provides the host's field-widget overrides to every `<EditorFields>` rendered
 * beneath it. Mount it inside the host's client form shell (e.g. the admin's
 * `DocumentFormBody`) so the override travels client-side, never across the RSC
 * boundary.
 *
 * @param props.register - The registration pass applied after the built-in widgets.
 * @param props.children - The form subtree whose field surfaces adopt the overrides.
 * @returns The provider wrapping `children`.
 */
export function FieldWidgetsProvider({
    register,
    children,
}: {
    register: FieldWidgetExtension;
    children: ReactNode;
}): ReactNode {
    return <FieldWidgetsContext.Provider value={register}>{children}</FieldWidgetsContext.Provider>;
}

/**
 * Reads the host's field-widget override, or `null` when no
 * {@link FieldWidgetsProvider} is mounted (the library renders its built-in
 * widgets unchanged).
 *
 * @returns The registration pass, or `null`.
 */
export function useFieldWidgetExtension(): FieldWidgetExtension | null {
    return useContext(FieldWidgetsContext);
}
