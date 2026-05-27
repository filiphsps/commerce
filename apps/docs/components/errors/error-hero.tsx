type ErrorHeroProps = {
    /** SCREAMING_SNAKE_CASE error code, rendered as the page h1. */
    code: string;
    /** One-sentence summary, rendered under the code. */
    description: string;
    /** Error class name (e.g. `UnknownLocaleError`); links to its reference page when present. */
    errorClass?: string;
    /** Kind enum name (e.g. `ApiErrorKind`); rendered as a subtle pill. */
    kind?: string;
    /** Reference-tab URL for the class badge. */
    classHref?: string;
};

/**
 * Page hero for an error code. Amber-glow gradient panel framing the code,
 * description, and a column of right-aligned class/kind badges. Reference:
 * visuals/04-page-errors.html.
 *
 * @param props - Code, description, optional class name, kind, and link.
 * @returns A grid-layout hero block.
 */
export function ErrorHero({ code, description, errorClass, kind, classHref }: ErrorHeroProps) {
    return (
        <div className="not-prose relative mb-8 grid grid-cols-1 items-end gap-6 overflow-hidden rounded-[0.45rem] border-[0.2rem] border-err bg-[linear-gradient(135deg,hsl(28_95%_58%_/_0.13),hsl(28_95%_58%_/_0.02)_60%,transparent)] px-5 py-6 shadow-[0_0_50px_hsl(28_95%_58%_/_0.12),inset_0_0_0_1px_hsl(28_95%_58%_/_0.1)] sm:grid-cols-[1fr_auto] sm:gap-8 sm:px-7 sm:py-7">
            <div
                aria-hidden
                className="pointer-events-none absolute top-[-50%] right-[-10%] h-[200%] w-1/2 bg-[radial-gradient(ellipse,hsl(28_95%_58%_/_0.15),transparent_60%)]"
            />
            <div className="relative z-[1] min-w-0">
                <h1 className="m-0 break-words font-mono font-bold text-[clamp(1.25rem,5vw,2.1rem)] text-err leading-tight tracking-[0.005em]">
                    {code}
                </h1>
                <p className="mt-3.5 max-w-[50ch] font-semibold text-[clamp(0.95rem,2.5vw,1.05rem)] text-fg leading-snug">
                    {description}
                </p>
            </div>
            <div className="relative z-[1] flex flex-col items-end gap-2">
                {errorClass ? (
                    classHref ? (
                        <a
                            className="whitespace-nowrap rounded-[4px] border-[0.138rem] border-ref bg-ref/10 px-2 py-1 font-bold font-mono text-[0.62rem] text-ref uppercase tracking-[0.16em] no-underline transition-colors duration-150 hover:bg-ref/20"
                            href={classHref}
                        >
                            {errorClass} ↗
                        </a>
                    ) : (
                        <span className="whitespace-nowrap rounded-[4px] border-[0.138rem] border-ref bg-ref/10 px-2 py-1 font-bold font-mono text-[0.62rem] text-ref uppercase tracking-[0.16em]">
                            {errorClass}
                        </span>
                    )
                ) : null}
                {kind ? (
                    <span className="whitespace-nowrap rounded-[4px] border-[0.138rem] border-border-strong bg-bg-2 px-2 py-1 font-bold font-mono text-[0.62rem] text-fg uppercase tracking-[0.16em]">
                        {kind}
                    </span>
                ) : null}
            </div>
        </div>
    );
}
