import { useEffect, useState } from 'react';

import { getTranslations, type LocaleDictionary } from '@/utils/locale';
import { useCart } from '@shopify/hydrogen-react';

import { MultilineInput } from '@/components/actionable/input';

const CartNote = ({ i18n }: { i18n: LocaleDictionary }) => {
    const { t } = getTranslations('cart', i18n);
    const { cartReady, note, noteUpdate } = useCart();
    const [text, setText] = useState('');

    useEffect(() => {
        if (!note || note === text) return;

        setText(note);
    }, [note, text]);

    return (
        <MultilineInput
            className="h-16"
            value={text}
            placeholder={t('placeholder-cart-note')}
            onChange={(e: any) => setText(e.target.value)}
            onBlur={() => text !== note && noteUpdate(text.length > 0 ? text : '')}
            disabled={!cartReady}
        />
    );
};

CartNote.displayName = 'Nordcom.Cart.Note';
export { CartNote };
