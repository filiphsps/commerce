'use client';

import { useCartActions, useCartMeta, useCartStatus } from '@nordcom/cart-react';
import { type ChangeEvent, useState } from 'react';
import type { AppCartCaps } from '@/cart/caps';
import { MultilineInput } from '@/components/actionable/input';
import { getTranslations, type LocaleDictionary } from '@/utils/locale';

/**
 * Controlled textarea that persists a note on the Shopify cart on blur. Carries an explicit
 * `aria-label` (not just a placeholder, which disappears on input and is not a reliable accessible
 * name) so assistive tech announces the field.
 *
 * @param props.i18n - Locale dictionary for the placeholder and accessible label.
 * @returns The cart note textarea.
 */
const CartNote = ({ i18n }: { i18n: LocaleDictionary }) => {
    const { t } = getTranslations('cart', i18n);
    const { note } = useCartMeta();
    const { cartReady } = useCartStatus();
    const { updateNote } = useCartActions<AppCartCaps>();
    const [text, setText] = useState(note ?? '');
    const [lastNote, setLastNote] = useState(note);

    // Sync local text whenever the upstream `note` prop changes.
    if (note !== lastNote) {
        setLastNote(note);
        if (note && note !== text) {
            setText(note);
        }
    }

    return (
        <MultilineInput
            className="h-16"
            value={text}
            aria-label={t('placeholder-cart-note')}
            placeholder={t('placeholder-cart-note')}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
            onBlur={() => text !== note && void updateNote(text.length > 0 ? text : '')}
            disabled={!cartReady}
        />
    );
};

CartNote.displayName = 'Nordcom.Cart.Note';

export { CartNote };
