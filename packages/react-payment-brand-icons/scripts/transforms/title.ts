import type { INode } from 'svgson';

export function stripTitleAndAria(root: INode): void {
    root.children = root.children.filter((child) => child.name !== 'title');
    delete root.attributes['aria-labelledby'];
    delete root.attributes['aria-label'];
    delete root.attributes.role;
}
