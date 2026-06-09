'use client';

import { Component, type ReactNode } from 'react';

type IslandErrorBoundaryProps = {
    fallback: ReactNode;
    children: ReactNode;
};

type IslandErrorBoundaryState = {
    failed: boolean;
};

/**
 * Error boundary for Lane-2 reactive islands enforcing the degraded contract
 * (spec §2.3): when the live subtree fails — Convex rejects the subscription
 * (auth failure), the provider/socket setup throws, or the code-split island
 * chunk fails to load — the boundary swaps in the read-only snapshot `fallback`
 * instead of letting the failure blank the surface or strand a spinner. A class
 * component because `getDerivedStateFromError` is still the only React error
 * boundary API; deliberately convex-free so mounting it costs the public bundle
 * nothing.
 */
export class IslandErrorBoundary extends Component<IslandErrorBoundaryProps, IslandErrorBoundaryState> {
    state: IslandErrorBoundaryState = { failed: false };

    /**
     * Flags the boundary as failed so the next render paints the fallback.
     *
     * @returns The failed state replacing the current one.
     */
    static getDerivedStateFromError(): IslandErrorBoundaryState {
        return { failed: true };
    }

    /**
     * Renders the live subtree until it fails, then the read-only fallback.
     *
     * @returns The children, or the fallback after a failure.
     */
    render(): ReactNode {
        return this.state.failed ? this.props.fallback : this.props.children;
    }
}
