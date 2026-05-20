// apps/docs/components/api/api-reference.tsx
import { getTypedocOutRoot, groupSymbols, loadSubpathJson, type TypeDocProject } from '@/lib/typedoc-loader';
import { SymbolTable } from './symbol-table';

const GITHUB_BASE = 'https://github.com/filiphsps/commerce/blob/master';

export type ApiReferenceProps = {
    /** Full subpath key (e.g. 'cms/blocks/render', 'cms/index' for the root export). */
    subpath: string;
    /** Override for tests; production uses `getTypedocOutRoot()`. */
    _rootDir?: string;
};

export async function ApiReference({ subpath, _rootDir }: ApiReferenceProps): Promise<React.JSX.Element> {
    const rootDir = _rootDir ?? getTypedocOutRoot();
    let project: TypeDocProject;
    try {
        project = loadSubpathJson(rootDir, subpath);
    } catch {
        if (process.env.NODE_ENV !== 'production') {
            return (
                <div
                    className="api-reference-error"
                    style={{ color: 'red', border: '1px solid currentColor', padding: '1rem' }}
                >
                    <strong>Unknown subpath "{subpath}"</strong>
                    <p>
                        No TypeDoc JSON at{' '}
                        <code>
                            {rootDir}/{subpath}.json
                        </code>
                        . Run <code>pnpm pre:typedoc</code>.
                    </p>
                </div>
            );
        }
        console.warn(`[ApiReference] Unknown subpath "${subpath}"`);
        // biome-ignore lint/complexity/noUselessFragments: Example
        return <></>;
    }

    const groups = groupSymbols(project);
    const sourceBaseUrl = GITHUB_BASE;

    const groupEntries = await Promise.all(
        Object.entries(groups).map(async ([title, symbols]) => {
            const table = await SymbolTable({ title, symbols, sourceBaseUrl });
            return <div key={title}>{table}</div>;
        }),
    );

    return <div className="api-reference">{groupEntries}</div>;
}
