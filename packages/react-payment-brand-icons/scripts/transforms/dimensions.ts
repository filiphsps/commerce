import type { INode } from 'svgson';

export function stripDimensions(root: INode): void {
    if (!root.attributes.viewBox) {
        throw new Error('SVG root <svg> is missing a viewBox attribute — codegen requires viewBox to be present.');
    }
    delete root.attributes.width;
    delete root.attributes.height;
}
