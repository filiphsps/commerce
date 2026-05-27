'use client';

import { useContext, useState } from 'react';
import { CartCapabilitiesContext, CartLinesContext, CartPendingContext, CartStatusContext } from './contexts';

/**
 * Development-only overlay that renders a toggleable JSON dump of cart
 * provider state. Returns `null` in production builds so bundlers can
 * tree-shake the panel completely.
 *
 * @returns A fixed-position devtools panel in development; `null` in production.
 * @example
 * ```tsx
 * // Mount alongside <CartProvider> during local development.
 * <CartProvider {...cartProps}>
 *   {children}
 *   <CartDevtools />
 * </CartProvider>
 * ```
 */
export function CartDevtools() {
    if (process.env.NODE_ENV === 'production') return null;
    return <CartDevtoolsPanel />;
}

/**
 * Renders the toggleable cart state inspector. Only instantiated in
 * development — {@link CartDevtools} gates creation on `NODE_ENV`.
 *
 * @returns A fixed-position overlay with a toggle button and a JSON dump of
 *   cart lines, pending mutations, status, and capabilities.
 */
function CartDevtoolsPanel() {
    const [open, setOpen] = useState(false);
    const lines = useContext(CartLinesContext);
    const pending = useContext(CartPendingContext);
    const status = useContext(CartStatusContext);
    const caps = useContext(CartCapabilitiesContext);
    return (
        <div
            style={{
                position: 'fixed',
                bottom: 0,
                right: 0,
                padding: 8,
                zIndex: 99999,
                background: '#222',
                color: '#fff',
                fontFamily: 'monospace',
                fontSize: 12,
            }}
        >
            <button type="button" onClick={() => setOpen((v) => !v)}>
                {open ? 'Hide cart devtools' : 'Show cart devtools'}
            </button>
            {open ? (
                <pre style={{ maxWidth: 400, maxHeight: 400, overflow: 'auto', margin: 0, padding: 8 }}>
                    {JSON.stringify({ status, lines, pending, capabilities: caps }, null, 2)}
                </pre>
            ) : null}
        </div>
    );
}
