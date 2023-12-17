import type { StoreModel } from '@/models/StoreModel';
import Image from 'next/image';
import type { FunctionComponent } from 'react';
import styled from 'styled-components';

const Container = styled.div`
    display: flex;
    gap: var(--block-spacer-small);
    justify-content: center;
    align-items: center;
`;
const Method = styled.div`
    position: relative;
    width: 4.15rem;
    height: 3rem;
`;

interface AcceptedPaymentMethodsProps {
    store: StoreModel;
}
export const AcceptedPaymentMethods: FunctionComponent<AcceptedPaymentMethodsProps> = ({ store }) => {
    const methods = store?.payment?.methods?.map((i) => i.toLowerCase());
    const wallets = store?.payment?.wallets?.map((i) => i.toLowerCase());

    if (!methods && !wallets) return null;

    return (
        <Container>
            {methods?.map((method) => (
                <Method key={method}>
                    <Image src={`/assets/payments/${method}.svg`} alt={method} sizes="35px" fill />
                </Method>
            ))}
            {wallets?.map((method) => (
                <Method key={method}>
                    <Image src={`/assets/payments/${method}.svg`} alt={method} sizes="35px" fill />
                </Method>
            ))}
        </Container>
    );
};
