import { MultilineInput } from '@/components/actionable/input';
import styles from '@/components/cart/cart-note.module.scss';
import { Label } from '@/components/typography/label';
import { useCart } from '@shopify/hydrogen-react';
import { useEffect, useState } from 'react';

const CartNote = ({}) => {
    const { status, note, noteUpdate } = useCart();
    const [text, setText] = useState('');

    useEffect(() => {
        if (!note || note === text) return;

        setText(note);
    }, [note]);

    if (status === 'uninitialized' || status === 'creating') return null;

    return (
        <section className={styles.container}>
            <Label>Special Request or Instructions</Label>
            <MultilineInput
                className={styles.input}
                value={text}
                // TODO: Make this customizable.
                placeholder="How can we make this experience memorable for you?"
                onChange={(e: any) => setText(e.target.value)}
                onBlur={() => text !== note && noteUpdate((text.length > 0 && text) || '')}
                disabled={status !== 'idle'}
                autoFocus={true}
            />
        </section>
    );
};

CartNote.displayName = 'Nordcom.Cart.Note';
export { CartNote };
