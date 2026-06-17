import 'server-only';

import { resolveLink } from '@nordcom/commerce-cms/api';
import type { Footer as FooterDoc } from '@nordcom/commerce-cms/types';
import type { OnlineShop } from '@nordcom/commerce-db';
import Image from 'next/image';
import { Suspense } from 'react';
import { FooterApi } from '@/api/_loaders';
import FooterContent from '@/components/footer/footer-content';
import Link from '@/components/link';
import type { Locale, LocaleDictionary } from '@/utils/locale';

const BLOCK_STYLES = 'grow w-full h-full flex-col auto-rows-auto gap-3 flex empty:hidden md:empty:flex';

// Pin the copyright year at module load. The Footer is rendered inside the
// `'use cache'`-tagged layout, so re-evaluating `new Date().getFullYear()` on
// every render would still get baked into the cached output — better to read
// it once at process start than once per server render, since the cached
// output is the source of truth either way.
const COPYRIGHT_YEAR = new Date().getFullYear();

type Section = NonNullable<FooterDoc['sections']>[number];
type SectionLinks = NonNullable<Section['links']>;
type SectionLink = SectionLinks[number];
type LegalLink = NonNullable<FooterDoc['legal']>[number];
type Social = NonNullable<FooterDoc['social']>[number];

// `lucide-react` v1+ ships no brand glyphs, so inline SVGs keep the footer
// self-contained without pulling in another icon package.
type SocialIconProps = { className?: string };
/** Instagram brand icon as an inline SVG. */
const InstagramIcon = ({ className }: SocialIconProps) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={true}
        className={className}
    >
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
);
/** Facebook brand icon as an inline SVG. */
const FacebookIcon = ({ className }: SocialIconProps) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden={true} className={className}>
        <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
    </svg>
);
/** YouTube brand icon as an inline SVG. */
const YoutubeIcon = ({ className }: SocialIconProps) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden={true} className={className}>
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.12C19.6 3.5 12 3.5 12 3.5s-7.6 0-9.4.58A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.12C4.4 20.5 12 20.5 12 20.5s7.6 0 9.4-.58a3 3 0 0 0 2.1-2.12A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8zM9.75 15.5v-7l6.5 3.5-6.5 3.5z" />
    </svg>
);
/** LinkedIn brand icon as an inline SVG. */
const LinkedinIcon = ({ className }: SocialIconProps) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden={true} className={className}>
        <path d="M19 0H5a5 5 0 0 0-5 5v14a5 5 0 0 0 5 5h14a5 5 0 0 0 5-5V5a5 5 0 0 0-5-5zM8 19H5V8h3v11zM6.5 6.7A1.74 1.74 0 1 1 8.24 5 1.74 1.74 0 0 1 6.5 6.7zM20 19h-3v-5.6c0-3.36-4-3.1-4 0V19h-3V8h3v1.76c1.4-2.6 7-2.8 7 2.48V19z" />
    </svg>
);
/** X (formerly Twitter) brand icon as an inline SVG. */
const TwitterXIcon = ({ className }: SocialIconProps) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden={true} className={className}>
        <path d="M18.244 2H21.5l-7.43 8.49L23 22h-6.91l-4.71-6.18L5.94 22H2.68l7.92-9.05L1.7 2h7.05l4.26 5.66L18.24 2zm-1.21 18h1.86L7.04 4H5.04l11.99 16z" />
    </svg>
);
/** TikTok brand icon as an inline SVG. */
const TiktokIcon = ({ className }: SocialIconProps) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden={true} className={className}>
        <path d="M21 8.78a8.83 8.83 0 0 1-5.18-1.66v7.45a6.43 6.43 0 1 1-5.55-6.37v3.06a3.39 3.39 0 1 0 2.49 3.27V2h3.06a5.76 5.76 0 0 0 5.18 5.16V8.78z" />
    </svg>
);

const SOCIAL_ICONS: Record<Social['platform'], React.ComponentType<SocialIconProps>> = {
    instagram: InstagramIcon,
    facebook: FacebookIcon,
    tiktok: TiktokIcon,
    youtube: YoutubeIcon,
    x: TwitterXIcon,
    linkedin: LinkedinIcon,
};

export type FooterProps = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
};

/**
 * Async site footer fetching CMS data and rendering logo, navigation sections,
 * social links, legal links, copyright, and payment/locale content.
 *
 * @param props.shop - Shop record providing logo and name.
 * @param props.locale - Active locale forwarded to link resolvers.
 * @param props.i18n - Locale dictionary forwarded to `FooterContent`.
 * @returns The full-width footer element.
 */
const Footer = async ({ shop, locale, i18n }: FooterProps) => {
    const footer = await FooterApi({ shop, locale });
    const { logo } = shop.design.header;
    const sections = footer?.sections ?? [];
    const social = footer?.social ?? [];
    const legal = footer?.legal ?? [];
    const copyrightLine = footer?.copyrightLine || `© ${COPYRIGHT_YEAR} ${shop.name}`;

    // iOS home-indicator gap: with `viewport-fit=cover` the page paints under the inset, so a
    // dark footer left a white strip where the body background showed through the safe area. The
    // bottom padding folds `env(safe-area-inset-bottom)` into the footer's own box, so its
    // `bg-primary` fills the inset instead of the body. No-op on devices without an inset.
    return (
        <footer className="flex h-full max-h-max w-full items-center justify-around self-end overflow-hidden bg-primary p-2 pt-8 pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-primary-foreground [grid-area:footer] md:p-3 md:pt-6 md:pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <div className="flex h-full w-full max-w-(--page-width) flex-col items-stretch gap-4 md:gap-8 2xl:px-3">
                <section className="grid h-full w-full grid-cols-1 items-start justify-between gap-6 pb-6 text-left md:flex lg:pb-12">
                    <div className={BLOCK_STYLES}>
                        {logo.src ? (
                            <Image
                                className="h-16 w-auto object-contain object-left brightness-100 grayscale invert"
                                title={shop.name}
                                src={logo.src}
                                alt={`${shop.name}'s Logo`}
                                width={logo.width}
                                height={logo.height}
                                sizes="(max-width: 950px) 75px, 225px"
                                priority={false}
                                loading="lazy"
                                decoding="async"
                                draggable={false}
                            />
                        ) : null}
                    </div>

                    {sections.map((section, idx) => (
                        <FooterSection key={section.id ?? `s-${idx}`} section={section} locale={locale} />
                    ))}
                </section>

                {social.length > 0 ? (
                    <ul className="flex flex-wrap items-center gap-3">
                        {social.map((s, i) => {
                            const Icon = SOCIAL_ICONS[s.platform];
                            return (
                                <li key={s.id ?? `so-${i}`}>
                                    <Link
                                        href={s.url}
                                        target="_blank"
                                        aria-label={s.platform}
                                        className="block rounded-full p-1 transition-colors hover:bg-(--surface-0)/10 focus-visible:bg-(--surface-0)/10"
                                    >
                                        <Icon className="h-5 w-5" />
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                ) : null}

                {legal.length > 0 ? (
                    <ul className="flex flex-wrap items-center gap-3 text-sm">
                        {legal.map((l, i) => (
                            <li key={l.id ?? `l-${i}`}>
                                <FooterLegalLink item={l} locale={locale} />
                            </li>
                        ))}
                    </ul>
                ) : null}

                <section className="text-sm opacity-80">{copyrightLine}</section>

                <Suspense key="layout.footer.footer-content" fallback={<FooterContent.skeleton />}>
                    <FooterContent locale={locale} i18n={i18n} shop={shop} />
                </Suspense>
            </div>
        </footer>
    );
};

/**
 * Renders a single CMS-defined footer navigation section with its title and links.
 *
 * @param props.section - CMS footer section data containing title and link array.
 * @param props.locale - Active locale forwarded to `resolveLink`.
 * @returns The section block, or `null` when it has no links.
 */
function FooterSection({ section, locale }: { section: Section; locale: Locale }) {
    const links: SectionLinks = section.links ?? [];
    if (links.length === 0) return null;
    return (
        <div className={BLOCK_STYLES} data-align="right">
            <div className="font-extrabold text-lg leading-tight md:text-xl">{section.title}</div>
            <ul className="flex flex-wrap gap-2 md:gap-y-1">
                {links.map((l, i) => (
                    <li key={l.id ?? `sl-${i}`}>
                        <FooterLinkAnchor item={l} locale={locale} />
                    </li>
                ))}
            </ul>
        </div>
    );
}

/**
 * Renders a single navigational link inside a `FooterSection`.
 *
 * @param props.item - CMS section link entry.
 * @param props.locale - Active locale for URL resolution.
 * @returns The anchor element, or `null` when the link cannot be resolved.
 */
function FooterLinkAnchor({ item, locale }: { item: SectionLink; locale: Locale }) {
    if (!item.link) return null;
    const href = resolveLink(item.link as never, { locale: { code: locale.code } });
    if (!href && !item.link.url) return null;
    return (
        <Link
            href={href || item.link.url || '/'}
            target={item.link.openInNewTab ? '_blank' : undefined}
            className="text-base leading-none hover:underline focus-visible:underline md:text-sm"
        >
            {item.link.label}
        </Link>
    );
}

/**
 * Renders a muted legal page link in the footer's bottom legal strip.
 *
 * @param props.item - CMS legal link entry.
 * @param props.locale - Active locale for URL resolution.
 * @returns The anchor element, or `null` when the link cannot be resolved.
 */
function FooterLegalLink({ item, locale }: { item: LegalLink; locale: Locale }) {
    if (!item.link) return null;
    const href = resolveLink(item.link as never, { locale: { code: locale.code } });
    if (!href && !item.link.url) return null;
    return (
        <Link
            href={href || item.link.url || '/'}
            target={item.link.openInNewTab ? '_blank' : undefined}
            className="text-sm leading-none opacity-80 hover:underline focus-visible:underline"
        >
            {item.link.label}
        </Link>
    );
}

Footer.skeleton = () => (
    <footer className="flex h-full max-h-max w-full items-center justify-around self-end overflow-hidden bg-primary p-2 pt-8 text-primary-foreground [grid-area:footer] md:p-3 md:pt-6">
        <div className="flex h-full w-full max-w-(--page-width) flex-col items-stretch gap-4 md:gap-8 2xl:px-3">
            <section className="grid h-full w-full grid-cols-1 items-start justify-between gap-6 pb-6 text-left md:flex lg:pb-12">
                <div className={BLOCK_STYLES}>
                    <div className="h-16 w-full overflow-hidden" data-skeleton></div>
                </div>
            </section>
            <FooterContent.skeleton />
        </div>
    </footer>
);

Footer.displayName = 'Nordcom.Footer';
export default Footer;
