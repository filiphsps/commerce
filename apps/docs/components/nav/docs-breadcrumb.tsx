// apps/docs/components/nav/docs-breadcrumb.tsx
'use client';

import { useSelectedLayoutSegments } from 'next/navigation';
import { Breadcrumb } from './breadcrumb';

export function DocsBreadcrumb(): React.JSX.Element {
    const segments = useSelectedLayoutSegments();
    // Strip the `(generated)` route group token (and any other Next.js route groups) if present.
    const cleaned = segments.filter((s) => !s.startsWith('('));
    return <Breadcrumb segments={cleaned} />;
}
