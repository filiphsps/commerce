import { Children, Fragment, isValidElement, type ReactNode } from 'react';

/**
 * Returns true if the rendered parallel-route slot has any non-null content.
 * Used by the dashboard layout to decide whether the shell should render
 * the SubNav / Inspector pane at all.
 *
 * Treats `null`, `undefined`, `false`, and whitespace-only strings as "empty".
 * Recurses into React fragments so a fragment whose children are all empty
 * counts as empty (Next.js wraps null-returning default.tsx slots in a fragment).
 */
export function slotHasContent(node: ReactNode): boolean {
    if (node === null || node === undefined || node === false) return false;
    if (typeof node === 'string') return node.trim() !== '';
    if (typeof node === 'number') return true;

    // Recurse into fragments — Children.forEach sees the fragment element itself
    // as one child rather than iterating into it.
    if (isValidElement(node) && node.type === Fragment) {
        return slotHasContent((node.props as { children?: ReactNode }).children);
    }

    let any = false;
    Children.forEach(node, (child) => {
        if (child === null || child === undefined || child === false) return;
        if (typeof child === 'string' && child.trim() === '') return;
        any = true;
    });
    return any;
}
