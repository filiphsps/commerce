import * as PrismicDOM from '@prismicio/helpers';

import React, { FunctionComponent } from 'react';

import { FooterApi } from '../../api/footer';
import Image from 'next/image';
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

interface FooterProps {
    store?: any;
    country?: string;
}
const Footer: FunctionComponent<FooterProps> = (props) => {
    const { store } = props;
    const { data } = useSWR([`footer`], () => FooterApi() as any, {});

    return (
        <>
            <PaymentIconsWrapper>
                <PaymentIconsContainer>
                    <Image src={PaymentIcons} layout="responsive" />
                </PaymentIconsContainer>
            </PaymentIconsWrapper>
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
                            <Link href="mailto:hi@spsgroup.se">
                                hi@spsgroup.se
                            </Link>
                        </div>
                        <div className="Footer-Blocks-Block">
                            <h2>Social</h2>
                            <Link href="https://www.instagram.com/candybysweden/">
                                Instagram
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
