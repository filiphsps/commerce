// apps/docs/app/docs/layout.tsx
import { DocsBreadcrumb } from '@/components/nav/docs-breadcrumb';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="docs-shell">
            <div className="docs-breadcrumb-bar border-gray-200 border-b px-6 py-3 dark:border-gray-800">
                <DocsBreadcrumb />
            </div>
            {children}
        </div>
    );
}
