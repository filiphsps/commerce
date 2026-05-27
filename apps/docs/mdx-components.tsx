import * as TabsComponents from 'fumadocs-ui/components/tabs';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { BetaBanner } from './components/banners/beta-banner';
import { DeprecatedBanner } from './components/banners/deprecated-banner';
import { ExperimentalBanner } from './components/banners/experimental-banner';
import { InlinePill } from './components/banners/inline-pill';
import { InternalBanner } from './components/banners/internal-banner';
import { Callout } from './components/callout';
import { ContinueExploring } from './components/continue-exploring';
import { Causes } from './components/errors/causes';
import { ErrorHero } from './components/errors/error-hero';
import { RelatedErrors } from './components/errors/related-errors';
import { StableHelpUrl } from './components/errors/stable-help-url';
import { ThrownFromCard, ThrownFromList } from './components/errors/thrown-from-list';
import { EmptyChangelog } from './components/packages/empty-changelog';
import { RefBanner } from './components/packages/ref-banner';
import { EmptyJSDoc } from './components/reference/empty-jsdoc';
import { EmptySubpath } from './components/reference/empty-subpath';
import { IconCard, IconGallery } from './components/reference/icon-gallery';
import { KindLine } from './components/reference/kind-line';
import { ReferenceBackLink } from './components/reference/reference-back-link';
import { SourceFooter } from './components/reference/source-footer';
import { SymbolTitle } from './components/reference/symbol-title';
import { ThrowsBlock, ThrowsRow } from './components/reference/throws';
import { ResultBlock } from './components/result-block';

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
        SymbolTitle,
        ThrowsBlock,
        ThrowsRow,
        EmptyJSDoc,
        EmptySubpath,
        EmptyChangelog,
        RefBanner,
        DeprecatedBanner,
        BetaBanner,
        ExperimentalBanner,
        InternalBanner,
        InlinePill,
        Callout,
        ContinueExploring,
        ResultBlock,
        ErrorHero,
        Causes,
        ThrownFromCard,
        ThrownFromList,
        RelatedErrors,
        StableHelpUrl,
        ...components,
    } satisfies MDXComponents;
}
