// apps/docs/components/api/signature.tsx
import { codeToHtml } from 'shiki';

export type SignatureProps = {
    /** Raw TypeScript signature to highlight. */
    ts: string;
};

/** Server component — Shiki runs at build time during MDX compilation. */
export async function Signature({ ts }: SignatureProps): Promise<React.JSX.Element> {
    const html = await codeToHtml(ts, {
        lang: 'typescript',
        themes: { light: 'github-light', dark: 'github-dark' },
        defaultColor: false,
    });
    return (
        <div
            className="signature"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted Shiki output
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
