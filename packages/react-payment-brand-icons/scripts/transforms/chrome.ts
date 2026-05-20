import type { INode } from 'svgson';

export type StripChromeResult = { matched: boolean };

const CHROME_OUTER_D_PREFIX = 'M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32';
const CHROME_INNER_D_PREFIX = 'M35 1';
const WHITE_FILLS = new Set(['#fff', '#ffffff', 'white']);

function isPath(node: INode): boolean {
    return node.name === 'path';
}

function looksLikeOuterChrome(node: INode): boolean {
    if (!isPath(node)) return false;
    const opacity = parseFloat(node.attributes.opacity ?? '');
    const d = node.attributes.d ?? '';
    return Number.isFinite(opacity) && opacity > 0 && opacity < 0.2 && d.startsWith(CHROME_OUTER_D_PREFIX);
}

function looksLikeInnerChrome(node: INode): boolean {
    if (!isPath(node)) return false;
    const fill = (node.attributes.fill ?? '').toLowerCase();
    const d = node.attributes.d ?? '';
    return WHITE_FILLS.has(fill) && d.startsWith(CHROME_INNER_D_PREFIX);
}

export function stripChrome(root: INode): StripChromeResult {
    const pathIndices: number[] = [];
    root.children.forEach((child, index) => {
        if (isPath(child)) pathIndices.push(index);
    });
    if (pathIndices.length < 2) return { matched: false };

    const [outerIdx, innerIdx] = [pathIndices[0]!, pathIndices[1]!];
    const outer = root.children[outerIdx]!;
    const inner = root.children[innerIdx]!;
    if (!looksLikeOuterChrome(outer) || !looksLikeInnerChrome(inner)) {
        return { matched: false };
    }

    // Remove highest index first so the lower index remains valid.
    root.children.splice(innerIdx, 1);
    root.children.splice(outerIdx, 1);
    return { matched: true };
}
