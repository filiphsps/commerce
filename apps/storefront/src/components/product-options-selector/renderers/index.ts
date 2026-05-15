import type { ComponentType } from 'react';
import { SizeChipRenderer } from './size-chip-renderer';
import { TextChipRenderer } from './text-chip-renderer';
import type { ProductOptionValueRendererProps } from './types';

export const defaultRenderers: Record<string, ComponentType<ProductOptionValueRendererProps>> = {
    default: TextChipRenderer,
};

export { SizeChipRenderer, TextChipRenderer };
export type { ProductOptionValueRendererProps, RenderDensity } from './types';
