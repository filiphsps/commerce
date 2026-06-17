'use client';

import type { ComponentType } from 'react';

export type ProductCardCtaProps = {
    productHandle: string;
    seedVariantId: string;
    isSingleBuyable: boolean;
    isOpen: boolean;
    onActivate: () => void;
    onAdd: () => void;
    /** Localized control labels resolved by the CTA host (keeps the strategies i18n-agnostic). */
    labels: {
        add: string;
        choose: string;
        close: string;
    };
};

export type ProductCardCtaComponent = ComponentType<ProductCardCtaProps>;
