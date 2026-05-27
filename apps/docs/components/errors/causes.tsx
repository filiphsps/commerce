import type { ReactNode } from 'react';

/**
 * Amber-railed list of "Possible causes" rendered under an `ErrorHero`. The
 * list children come from authored MDX bullets — this wrapper restyles them.
 * Reference: visuals/04-page-errors.html.
 *
 * @param props - The bulleted-list MDX children.
 * @returns A styled `ul` element.
 */
export function Causes({ children }: { children: ReactNode }) {
    return (
        <ul className="not-prose m-0 flex list-none flex-col gap-2 p-0 [&_li]:rounded-r-[4px] [&_li]:border-l-[0.29rem] [&_li]:border-err [&_li]:bg-[linear-gradient(to_right,hsl(28_95%_58%_/_0.06),transparent_60%)] [&_li]:px-3.5 [&_li]:py-2.5 [&_li]:font-medium [&_li]:text-[0.95rem] [&_li]:text-fg [&_li]:leading-snug [&_li_code]:rounded-[3px] [&_li_code]:bg-bg-2 [&_li_code]:px-1.5 [&_li_code]:font-mono [&_li_code]:text-[0.85em] [&_li_code]:text-fg">
            {children}
        </ul>
    );
}
