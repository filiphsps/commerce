'use client';

import { UnknownLocaleError } from '@nordcom/commerce-errors';
import { X as CloseIcon, Search as SearchIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
    type FocusEvent,
    type KeyboardEvent,
    type SyntheticEvent,
    useCallback,
    useEffect,
    useId,
    useRef,
    useState,
} from 'react';
import { Button } from '@/components/actionable/button';
import Link from '@/components/link';
import { useIsDesktop } from '@/components/product-options/use-is-desktop';
import { getTranslations, type Locale, type LocaleDictionary } from '@/utils/locale';

export type HeaderSearchProps = {
    locale: Locale;
    i18n: LocaleDictionary;
};

/**
 * Header search control that progressively enhances the icon-only `/search/` link into an inline,
 * expandable search field on desktop.
 *
 * The no-JS path, the touch (mobile) viewport, and the pre-hydration / unknown-viewport render all
 * fall back to a plain locale-aware link to `/search/`, so search works without client JavaScript —
 * the icon link is the baseline. Only on a known desktop viewport, after hydration, does the icon
 * become a toggle that expands an inline field; submitting performs a client navigation to the
 * existing search route. Focus moves into the field on expand and returns to the trigger on Escape
 * or close, and the expand animation is gated behind `prefers-reduced-motion`.
 *
 * @param props.locale - Active locale used to build the localized search route.
 * @param props.i18n - Locale dictionary for the accessible labels and field placeholder.
 * @returns The header search element.
 * @throws {UnknownLocaleError} When a search is submitted but the locale carries no resolvable code,
 *   which would otherwise build a malformed localized URL.
 */
export function HeaderSearch({ locale, i18n }: HeaderSearchProps) {
    const { t } = getTranslations('common', i18n);
    const router = useRouter();
    const isDesktop = useIsDesktop();
    const [expanded, setExpanded] = useState(false);
    const containerRef = useRef<HTMLElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const restoreFocus = useRef(false);
    const fieldId = useId();

    // Move focus into the field when it expands; on a deliberate collapse (Escape / close button)
    // return focus to the trigger so keyboard users aren't dumped at the top of the document. The
    // trigger is re-rendered by the time this runs, so it is resolved from the container by marker.
    useEffect(() => {
        if (expanded) {
            inputRef.current?.focus();
            return;
        }

        if (restoreFocus.current) {
            restoreFocus.current = false;
            containerRef.current?.querySelector<HTMLButtonElement>('[data-search-trigger]')?.focus();
        }
    }, [expanded]);

    const collapse = useCallback((restore: boolean) => {
        restoreFocus.current = restore;
        setExpanded(false);
    }, []);

    const submit = useCallback(
        (event: SyntheticEvent<HTMLFormElement>) => {
            event.preventDefault();

            const query = inputRef.current?.value.trim() ?? '';
            if (!query) {
                inputRef.current?.focus();
                return;
            }

            if (!locale.code) {
                throw new UnknownLocaleError(locale.code);
            }

            router.push(`/${locale.code}/search/?q=${encodeURIComponent(query)}`);
            setExpanded(false);
        },
        [locale, router],
    );

    const onKeyDown = useCallback(
        (event: KeyboardEvent<HTMLFormElement>) => {
            if (event.key !== 'Escape') {
                return;
            }

            event.preventDefault();
            collapse(true);
        },
        [collapse],
    );

    const onBlur = useCallback(
        (event: FocusEvent<HTMLFormElement>) => {
            const next = event.relatedTarget;
            if (next && event.currentTarget.contains(next)) {
                return;
            }

            collapse(false);
        },
        [collapse],
    );

    const label = t('search');

    // SSR, the first client render (viewport unknown), and the touch viewport keep the icon-only
    // link — the no-JS / mobile fallback. Branching only once the viewport is known avoids hydrating
    // the desktop tree onto server markup that rendered the link.
    if (!isDesktop) {
        return (
            <search ref={containerRef} className="flex items-center">
                <Link
                    href="/search/"
                    locale={locale}
                    className="focus-ring rounded-lg transition-colors hover:text-primary focus-visible:text-primary"
                    aria-label={label}
                    title={label}
                >
                    <SearchIcon className="stroke-1 text-xl lg:text-2xl" />
                </Link>
            </search>
        );
    }

    return (
        <search ref={containerRef} className="flex items-center">
            {expanded ? (
                <form
                    onSubmit={submit}
                    onKeyDown={onKeyDown}
                    onBlur={onBlur}
                    className="flex items-center gap-1 motion-safe:animate-[product-card-overlay-fade-in_var(--product-card-motion-picker-in)_var(--product-card-motion-ease)]"
                >
                    <input
                        ref={inputRef}
                        id={fieldId}
                        name="q"
                        type="search"
                        enterKeyHint="search"
                        autoComplete="off"
                        aria-label={label}
                        placeholder={label}
                        className="focus-ring text-(color:var(--text)) h-9 w-48 appearance-none rounded-lg border border-(--border-strong) border-solid bg-(--surface-0) px-3 text-base lg:w-64"
                    />

                    <Button
                        styled={false}
                        type="submit"
                        aria-label={label}
                        title={label}
                        className="focus-ring rounded-lg p-1 transition-colors hover:text-primary focus-visible:text-primary"
                    >
                        <SearchIcon className="stroke-1 text-xl" />
                    </Button>

                    <Button
                        styled={false}
                        type="button"
                        onClick={() => collapse(true)}
                        aria-label={t('close')}
                        title={t('close')}
                        className="focus-ring rounded-lg p-1 transition-colors hover:text-primary focus-visible:text-primary"
                    >
                        <CloseIcon className="stroke-1 text-xl" />
                    </Button>
                </form>
            ) : (
                <Button
                    styled={false}
                    type="button"
                    onClick={() => setExpanded(true)}
                    aria-expanded={false}
                    aria-controls={fieldId}
                    aria-label={label}
                    title={label}
                    data-search-trigger
                    className="focus-ring rounded-lg transition-colors hover:text-primary focus-visible:text-primary"
                >
                    <SearchIcon className="stroke-1 text-xl lg:text-2xl" />
                </Button>
            )}
        </search>
    );
}
HeaderSearch.displayName = 'Nordcom.Header.HeaderSearch';
