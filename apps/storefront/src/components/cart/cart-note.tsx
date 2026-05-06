import { useCart } from '@shopify/hydrogen-react';
import { useState } from 'react';
import { MultilineInput } from '@/components/actionable/input';
import { getTranslations, type LocaleDictionary } from '@/utils/locale';

const CartNote = ({ i18n }: { i18n: LocaleDictionary }) => {
    const { t } = getTranslations('cart', i18n);
    const { cartReady, note, noteUpdate } = useCart();
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
            placeholder={t('placeholder-cart-note')}
            onChange={(e: any) => setText(e.target.value)}
            onBlur={() => text !== note && noteUpdate(text.length > 0 ? text : '')}
            disabled={!cartReady}
        />
    );
};

CartNote.displayName = 'Nordcom.Cart.Note';

export { CartNote };
