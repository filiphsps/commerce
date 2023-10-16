import type { FunctionComponent } from 'react';
import Image from 'next/image';
import type { StoreModel } from '@/models/StoreModel';
import { styled } from '@linaria/react';

const Container = styled.div`
    display: flex;
    gap: var(--block-spacer);
    justify-content: center;
    align-items: center;
`;
const Method = styled.div`
    position: relative;
    width: 4rem;
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
                    <Image src={`/assets/payments/${method}.svg`} alt={method} fill />
                </Method>
            ))}
            {wallets?.map((method) => (
                <Method key={method}>
                    <Image src={`/assets/payments/${method}.svg`} alt={method} fill />
                </Method>
            ))}
        </Container>
    );
};
