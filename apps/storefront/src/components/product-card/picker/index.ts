'use client';

import dynamic from 'next/dynamic';
import { registerProductCardPicker } from './registry';

// Defer Radix Dialog / Popover until first activation. SSR off — pickers are
// interactive only; no benefit to server-rendering an empty Portal target.
const FloatPicker = dynamic(() => import('./float'), { ssr: false });
const SheetPicker = dynamic(() => import('./sheet'), { ssr: false });
const InlinePicker = dynamic(() => import('./inline'), { ssr: false });

registerProductCardPicker('float', FloatPicker);
registerProductCardPicker('sheet', SheetPicker);
registerProductCardPicker('inline', InlinePicker);

export { getProductCardPicker } from './registry';
export type { ProductCardPickerComponent, ProductCardPickerProps } from './types';
