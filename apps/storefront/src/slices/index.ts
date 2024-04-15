import { components as commonComponents } from '@/slices/common';
import { components as navigationComponents } from '@/slices/navigation';
import { components as productComponents } from '@/slices/product';

export const components = {
    ...commonComponents,
    ...navigationComponents,
    ...productComponents
};
