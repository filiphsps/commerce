import 'server-only';

/**
 * Fixed warning banner shown only on Vercel preview deploys. Previews inherit the production
 * `CONVEX_URL`, so the admin reads and writes the SAME live tenant data — this strip exists so a
 * reviewer exercising a preview build is never unaware that every mutation is real. Gated on
 * `VERCEL_ENV`, the Vercel-injected system var that is `'preview'` only on preview deployments;
 * production and local builds render nothing.
 *
 * @returns The warning banner on preview deployments, otherwise `null`.
 */
export function PreviewBanner(): React.JSX.Element | null {
    if (process.env.VERCEL_ENV !== 'preview') {
        return null;
    }

    return (
        <div
            role="status"
            className="sticky top-0 z-[100] flex w-full items-center justify-center gap-2 bg-amber-400 px-3 py-1 text-center font-bold text-[0.7rem] text-amber-950 uppercase tracking-wide"
        >
            ⚠ Preview deployment — editing LIVE production data
        </div>
    );
}
