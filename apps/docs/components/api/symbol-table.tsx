// apps/docs/components/api/symbol-table.tsx
import type { TypeDocSignature, TypeDocSymbol } from '@/lib/typedoc-loader';
import { Signature } from './signature';

export type SymbolTableProps = {
    title: string;
    symbols: TypeDocSymbol[];
    /** GitHub base URL for "Source" links. */
    sourceBaseUrl: string;
};

export async function SymbolTable({ title, symbols, sourceBaseUrl }: SymbolTableProps): Promise<React.JSX.Element> {
    const entries = await Promise.all(symbols.map((symbol) => renderSymbolEntry(symbol, sourceBaseUrl)));
    return (
        <section className="symbol-table">
            <h2>{title}</h2>
            {entries}
        </section>
    );
}

async function renderSymbolEntry(symbol: TypeDocSymbol, sourceBaseUrl: string): Promise<React.JSX.Element> {
    const summary = symbol.comment?.summary?.map((s) => s.text).join('') ?? '';
    const source = symbol.sources?.[0];
    const sourceUrl = source ? (source.url ?? `${sourceBaseUrl}/${source.fileName}#L${source.line}`) : undefined;

    const signatures = await Promise.all(
        (symbol.signatures ?? []).map((sig) => renderSignatureEntry(sig, symbol.name)),
    );

    return (
        <article key={symbol.id} id={symbol.name} className="symbol-entry">
            <h3>
                <code>{symbol.name}</code>
                {sourceUrl ? (
                    <a className="symbol-source-link" href={sourceUrl} target="_blank" rel="noopener noreferrer">
                        Source
                    </a>
                ) : null}
            </h3>
            {signatures}
            {summary ? <p>{summary}</p> : null}
        </article>
    );
}

async function renderSignatureEntry(sig: TypeDocSignature, fallbackName: string): Promise<React.JSX.Element> {
    const params = (sig.parameters ?? []).map((p) => `${p.name}: ${renderType(p.type)}`).join(', ');
    const ret = renderType(sig.type);
    const ts = `function ${sig.name || fallbackName}(${params}): ${ret}`;
    const signature = await Signature({ ts });
    return <div key={sig.id}>{signature}</div>;
}

function renderType(type: { type: string; name?: string } | undefined): string {
    if (!type) return 'unknown';
    if (type.type === 'intrinsic') return type.name ?? 'unknown';
    if (type.type === 'reference') return type.name ?? 'unknown';
    return type.type;
}
