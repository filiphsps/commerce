import { useEffect, useState } from 'react';

import type { FunctionComponent } from 'react';
import { MultilineInput } from '@/components/Input';
import styled from 'styled-components';
import { useCart } from '@shopify/hydrogen-react';

const Label = styled.div`
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--block-spacer-small);
    font-weight: 500;
    font-size: 1.5rem;
    line-height: 1.5rem;
    transition: 250ms ease-in-out;

    div {
        font-size: 1.5rem;
        line-height: 1.25rem;
    }
`;

const Container = styled.section<{ open?: boolean }>`
    position: relative;
    display: flex;
    flex-wrap: wrap;
    flex-direction: column;
    gap: var(--block-spacer);

    ${MultilineInput} {
        height: 8rem;
        border-width: 0;
        padding: var(--block-padding);
    }
`;

interface CartNoteProps {}
export const CartNote: FunctionComponent<CartNoteProps> = ({}) => {
    const { status, note, noteUpdate } = useCart();
    const [text, setText] = useState('');

    useEffect(() => {
        if (!note || note === text) return;

        setText(note);
    }, [note]);

    if (status === 'uninitialized' || status === 'creating') return null;

    return (
        <Container>
            <Label>Special Request or Instructions</Label>
            <MultilineInput
                value={text}
                placeholder="How can we make this experience memorable for you?"
                onChange={(e) => setText(e.target.value)}
                onBlur={() => text !== note && noteUpdate((text.length > 0 && text) || '')}
                disabled={status !== 'idle'}
                autoFocus
            />
        </Container>
    );
};
