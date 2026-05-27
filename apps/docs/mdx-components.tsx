import defaultMdxComponents from 'fumadocs-ui/mdx';
import * as TabsComponents from 'fumadocs-ui/components/tabs';
import type { MDXComponents } from 'mdx/types';
import { KindLine } from './components/reference/kind-line';
import { ReferenceBackLink } from './components/reference/reference-back-link';
import { IconCard, IconGallery } from './components/reference/icon-gallery';
import { DeprecatedBanner } from './components/banners/deprecated-banner';
import { BetaBanner } from './components/banners/beta-banner';
import { ExperimentalBanner } from './components/banners/experimental-banner';
import { InternalBanner } from './components/banners/internal-banner';
import { InlinePill } from './components/banners/inline-pill';
import { Callout } from './components/callout';

/**
 * Bridges fumadocs-ui's default MDX renderers plus our custom MDX components
 * into both authored MDX and generator-emitted MDX. Covers reference chrome
 * (KindLine, ReferenceBackLink, IconGallery/IconCard), JSDoc lifecycle banners
 * (DeprecatedBanner, BetaBanner, ExperimentalBanner, InternalBanner, InlinePill),
 * and prose callouts (Callout).
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
        DeprecatedBanner,
        BetaBanner,
        ExperimentalBanner,
        InternalBanner,
        InlinePill,
        Callout,
        ...components,
    } satisfies MDXComponents;
}
