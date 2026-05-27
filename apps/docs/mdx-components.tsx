import defaultMdxComponents from 'fumadocs-ui/mdx';
import * as TabsComponents from 'fumadocs-ui/components/tabs';
import type { MDXComponents } from 'mdx/types';
import { KindLine } from './components/reference/kind-line';
import { ReferenceBackLink } from './components/reference/reference-back-link';
import { IconCard, IconGallery } from './components/reference/icon-gallery';
import { SourceFooter } from './components/reference/source-footer';
import { DeprecatedBanner } from './components/banners/deprecated-banner';
import { BetaBanner } from './components/banners/beta-banner';
import { ExperimentalBanner } from './components/banners/experimental-banner';
import { InternalBanner } from './components/banners/internal-banner';
import { InlinePill } from './components/banners/inline-pill';
import { Callout } from './components/callout';
import { ContinueExploring } from './components/continue-exploring';
import { ErrorHero } from './components/errors/error-hero';
import { Causes } from './components/errors/causes';
import { ThrownFromCard, ThrownFromList } from './components/errors/thrown-from-list';
import { RelatedErrors } from './components/errors/related-errors';
import { StableHelpUrl } from './components/errors/stable-help-url';

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
        SourceFooter,
        DeprecatedBanner,
        BetaBanner,
        ExperimentalBanner,
        InternalBanner,
        InlinePill,
        Callout,
        ContinueExploring,
        ErrorHero,
        Causes,
        ThrownFromCard,
        ThrownFromList,
        RelatedErrors,
        StableHelpUrl,
        ...components,
    } satisfies MDXComponents;
}
