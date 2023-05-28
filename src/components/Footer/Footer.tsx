import * as PrismicDOM from '@prismicio/helpers';

import React, { FunctionComponent } from 'react';

import { FooterApi } from '../../api/footer';
import Image from 'next/legacy/image';
//import Input from '../Input';
import Link from 'next/link';
//import { NewsletterApi } from '../../api/newsletter';
import PaymentIcons from '../../../public/assets/payments/icons.png';
import styled from 'styled-components';
import useSWR from 'swr';

const Copyright = styled.div`
    text-transform: uppercase;
`;
const PaymentIconsContainer = styled.div`
    max-width: 28rem;
    width: 100%;
    height: 6rem;
    margin-top: -1.5rem;
`;
const PaymentIconsWrapper = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 6rem;
    margin: 1rem 0px;
`;

/*const EmailCapture = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    background: var(--accent-primary);
`;
const EmailCaptureContent = styled.div`
    display: grid;
    justify-content: center;
    align-items: center;
    grid-template-columns: 1fr 1fr auto;
    gap: 1rem;
    max-width: 100%;
    width: 1465px;
    height: 100%;
    min-height: 2rem;
    padding: 1rem 2rem;
`;
const EmailCaptureInput = styled.div`
    display: flex;
    justify-content: flex-end;
    align-items: center;

    input {
        height: 3.5rem;
        padding: 1rem;
        background: #fefefe;
        font-size: 1.25rem;
    }
`;
const EmailCaptureTitle = styled.div`
    color: var(--color-text-primary);
    text-transform: uppercase;
    letter-spacing: 0.05rem;
    font-size: 1.75rem;
`;
const EmailCaptureSubmit = styled.button`
    height: 3.5rem;
    padding: 1rem 1.5rem;
    border-radius: var(--block-border-radius);
    background: var(--color-text-primary);
    font-size: 1.25rem;
    transition: 150ms;

    &:hover {
        background: var(--accent-secondary-dark);
        color: var(--color-text-primary);
    }

    &:disabled {
        background: var(--color-text-primary);
        color: unset;
        opacity: 0.5;
    }
`;*/

const BlockTitle = styled.div`
    font-size: 2rem;
    font-weight: 700;
    padding-bottom: 0.5rem;
`;

interface FooterProps {
    store?: any;
    country?: string;
}
const Footer: FunctionComponent<FooterProps> = (props) => {
    const { store } = props;
    const { data } = useSWR([`footer`], () => FooterApi() as any, {});
    //const [email, setEmail] = useState('');

    // FIXME: Togglable newsletter view.
    // FIXME: Dynamic copyright copy.

    return (
        <>
            <PaymentIconsWrapper>
                <PaymentIconsContainer>
                    <Image src={PaymentIcons} layout="responsive" />
                </PaymentIconsContainer>
            </PaymentIconsWrapper>

            {/*<EmailCapture>
                <EmailCaptureContent>
                    <EmailCaptureTitle>
                        Join our newsletter for exclusive deals and discounts
                    </EmailCaptureTitle>
                    <EmailCaptureInput>
                        <Input
                            type="email"
                            placeholder="candy@example.com"
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </EmailCaptureInput>
                    <EmailCaptureSubmit
                        disabled={
                            email.length <= 4 ||
                            !(email.includes('@') && email.includes('.'))
                        }
                        onClick={async () => {
                            try {
                                const res = await NewsletterApi({
                                    email: email
                                });
                                alert('Welcome to the world of Swedish candy!');
                            } catch (error) {
                                if (error.code == 'duplicate_parameter')
                                    alert(
                                        'You have already subscribed to the newsletter :)'
                                    );
                                else
                                    alert(
                                        'Something went wrong please try again!'
                                    );
                            }
                        }}
                    >
                        OK
                    </EmailCaptureSubmit>
                </EmailCaptureContent>
            </EmailCapture>*/}

            <footer className="Footer">
                <div className="Footer-Wrapper">
                    <div className="Footer-Blocks">
                        <div className="Footer-Blocks-Block Footer-Blocks-Block-About">
                            <div
                                className="Footer-Blocks-Block-About-Logo"
                                style={{
                                    backgroundImage: `url('${store?.logo?.src}')`
                                }}
                            />

                            <address
                                dangerouslySetInnerHTML={{
                                    __html:
                                        PrismicDOM.asText(
                                            data?.address,
                                            '<br />'
                                        ) || ''
                                }}
                            />
                        </div>

                        {data?.blocks?.map((block) => (
                            <div
                                key={block.title}
                                className="Footer-Blocks-Block"
                            >
                                <BlockTitle>{block.title}</BlockTitle>
                                {block?.items.map((item) => (
                                    <Link
                                        key={item.handle}
                                        href={item.handle}
                                        target={
                                            item.handle.startsWith('http')
                                                ? '_blank'
                                                : ''
                                        }
                                    >
                                        {item.title}
                                    </Link>
                                ))}
                            </div>
                        ))}
                    </div>

                    <Copyright>
                        &copy; 2020-{new Date().getFullYear()}{' '}
                        <a href="https://www.sweetsideofsweden.com/">
                            Sweet Side of Sweden
                        </a>{' '}
                        - All rights reserved
                    </Copyright>
                </div>
            </footer>
        </>
    );
};

export default Footer;
