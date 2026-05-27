import defaultMdxComponents from 'fumadocs-ui/mdx';
import * as TabsComponents from 'fumadocs-ui/components/tabs';
import type { MDXComponents } from 'mdx/types';
import { KindLine } from './components/reference/kind-line';
import { ReferenceBackLink } from './components/reference/reference-back-link';
import { IconCard, IconGallery } from './components/reference/icon-gallery';

/**
 * Bridges fumadocs-ui's default MDX renderers plus our custom MDX components
 * into both authored MDX and generator-emitted MDX. New components (callouts,
 * banners, pills, RedirectStub) get added here as they're built.
 *
 * @param components - Per-file overrides (rarely used).
 * @returns The full MDX component map fumadocs hands to its renderers.
 */
export function getMDXComponents(components?: MDXComponents): MDXComponents {
    return {
        ...defaultMdxComponents,
        ...TabsComponents,
        KindLine,
        ReferenceBackLink,
        IconCard,
        IconGallery,
        ...components,
    } satisfies MDXComponents;
}
