import * as PrismicDOM from '@prismicio/helpers';

import React, { FunctionComponent, useState } from 'react';

import { FooterApi } from '../../api/footer';
import Image from 'next/image';
import Input from '../Input';
import Link from 'next/link';
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

const EmailCapture = styled.div`
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
    transition: 250ms;

    &:hover {
        background: var(--accent-secondary-dark);
        color: var(--color-text-primary);
    }

    &:disabled {
        background: var(--color-text-primary);
        color: unset;
        opacity: 0.5;
    }
`;

interface FooterProps {
    store?: any;
    country?: string;
}
const Footer: FunctionComponent<FooterProps> = (props) => {
    const { store } = props;
    const { data } = useSWR([`footer`], () => FooterApi() as any, {});
    const [email, setEmail] = useState('');

    // FIXME: Add newsletter API.

    return (
        <>
            <PaymentIconsWrapper>
                <PaymentIconsContainer>
                    <Image src={PaymentIcons} layout="responsive" />
                </PaymentIconsContainer>
            </PaymentIconsWrapper>

            {false && (
                <EmailCapture>
                    <EmailCaptureContent>
                        <EmailCaptureTitle>
                            Join our newsletter for <b>15% off</b> your first
                            purchase
                        </EmailCaptureTitle>
                        <EmailCaptureInput>
                            <Input
                                type="email"
                                placeholder="candy@example.com"
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </EmailCaptureInput>
                        <EmailCaptureSubmit
                            disabled={email.length <= 0}
                            onClick={() => {
                                alert('Hello world');
                            }}
                        >
                            OK
                        </EmailCaptureSubmit>
                    </EmailCaptureContent>
                </EmailCapture>
            )}

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
                                    __html: PrismicDOM.asText(
                                        data?.address,
                                        '<br />'
                                    )
                                }}
                            />
                        </div>

                        <div className="Footer-Blocks-Block">
                            <h2>Information</h2>
                            <Link href="/shipping">Shipping Policy</Link>
                            <Link href="/about">Returns</Link>
                        </div>
                        <div className="Footer-Blocks-Block">
                            <h2>Contact</h2>
                            <Link href="/about">About us</Link>
                            <Link href="mailto:hi@spsgroup.se" target="_blank">
                                hi@spsgroup.se
                            </Link>
                        </div>
                        <div className="Footer-Blocks-Block">
                            <h2>Social</h2>
                            <Link
                                href="https://www.instagram.com/candybysweden/"
                                target="_blank"
                            >
                                Instagram
                            </Link>
                            <Link
                                href="https://www.twitter.com/candybysweden/"
                                target="_blank"
                            >
                                Twitter
                            </Link>
                        </div>
                    </div>

                    <Copyright>
                        &copy; {new Date().getFullYear()}{' '}
                        <a href="https://spsgroup.se">SPS Group AB</a> - All
                        rights reserved
                    </Copyright>
                </div>
            </footer>
        </>
    );
};

export default Footer;
