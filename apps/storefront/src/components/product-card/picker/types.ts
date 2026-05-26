'use client';

import type { ComponentType } from 'react';
import type { Product } from '@/api/product';
import type { Locale, LocaleDictionary } from '@/utils/locale';

export type ProductCardPickerProps = {
    product: Product;
    locale: Locale;
    i18n: LocaleDictionary;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export type ProductCardPickerComponent = ComponentType<ProductCardPickerProps>;
