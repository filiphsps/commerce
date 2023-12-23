import { MultilineInput } from '@/components/actionable/input';
import styles from '@/components/cart/cart-note.module.scss';
import { useTranslation, type LocaleDictionary } from '@/utils/locale';
import { useCart } from '@shopify/hydrogen-react';
import { useEffect, useState } from 'react';

const CartNote = ({ i18n }: { i18n: LocaleDictionary }) => {
    const { t } = useTranslation('cart', i18n);
    const { status, note, noteUpdate } = useCart();
    const [text, setText] = useState('');

    useEffect(() => {
        if (!note || note === text) return;

        setText(note);
    }, [note]);

    if (status === 'uninitialized' || status === 'creating') return null;

    return (
        <>
            <MultilineInput
                className={styles.input}
                value={text}
                placeholder={t('placeholder-cart-note')}
                onChange={(e: any) => setText(e.target.value)}
                onBlur={() => text !== note && noteUpdate((text.length > 0 && text) || '')}
                disabled={status !== 'idle'}
            />
        </>
    );
};

CartNote.displayName = 'Nordcom.Cart.Note';
export { CartNote };
