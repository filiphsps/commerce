import * as PrismicDOM from '@prismicio/helpers';

import React, { FunctionComponent } from 'react';

import { AcceptedPaymentMethods } from '../AcceptedPaymentMethods';
import { Config } from '../../util/Config';
import EmailCapture from '../EmailCapture';
import { FooterApi } from '../../api/footer';
import Image from 'next/image';
import { ImageLoader } from '../../util/ImageLoader';
import Link from 'next/link';
import { StoreModel } from '../../models/StoreModel';
import preval from '../../../src/data.preval';
import styled from 'styled-components';
import useSWR from 'swr';

const Logo = styled.div`
    position: relative;
    display: block;
    width: 100%;
    height: 5rem;
    margin: 0px 0px 1rem 0px;

    img {
        display: block;
        height: 100%;
        width: 100%;
        object-fit: contain;
        object-position: center;

        @media (min-width: 950px) {
            object-position: 0px;
        }
    }
`;
const Address = styled.address`
    font-size: 1.25rem;
    line-height: 1.75rem;
    font-weight: 400;

    @media (max-width: 950px) {
        text-align: center;
    }
`;

const FooterContainer = styled.footer`
    display: flex;
    justify-content: space-around;
    align-items: center;
    width: 100%;
    background: var(--accent-primary-dark);
    color: var(--color-text-primary);
    padding-top: 1rem;

    a {
        transition: 150ms ease-in-out;
        &:hover {
            color: var(--accent-secondary-dark);
        }
    }
`;
const FooterWrapper = styled.div`
    display: grid;
    grid-template-rows: auto 1fr;
    grid-gap: 1.5rem;
    width: 1465px;
    max-width: 100%;
    padding: 1rem;
`;
const FooterBlocksContainer = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    text-align: left;
    gap: 1rem;

    @media (max-width: 950px) {
        display: grid;
        grid-template-columns: 1fr;
    }
`;
const FooterBlock = styled.div`
    display: flex;
    align-items: center;
    flex-direction: column;
    width: 100%;
    height: 100%;

    font-size: 1.75rem;
    line-height: 2rem;
    font-weight: 400;

    @media (min-width: 950px) {
        padding-bottom: 0px;
        align-items: flex-start;
        justify-content: flex-start;
    }
`;

const BlockTitle = styled.div`
    font-size: 2.5rem;
    line-height: 2.75rem;
    font-weight: 700;
`;

const LegalAndCopyright = styled.div`
    height: 4rem;

    @media (max-width: 950px) {
        margin: 1rem 0px;
    }
`;
const FooterBottomSection = styled.section`
    display: grid;
    grid-template-columns: 1fr;
    border-top: 0.02rem solid var(--accent-primary);
    padding-top: 1rem;

    @media (min-width: 950px) {
        grid-template-columns: 1fr 1fr;
    }

    // Make the footer a bit taller to deal with the support chat
    @media (max-width: 1450px) {
        padding-bottom: 8rem;
    }
`;
const FooterBottomSectionBlock = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: flex-start;
    gap: 0.5em;

    &:nth-child(2) {
        align-items: flex-end;

        @media (max-width: 950px) {
            align-items: center;
        }
    }

    @media (max-width: 950px) {
        justify-content: flex-end;
        align-items: center;
    }
`;
const ImportantLinks = styled.div`
    display: grid;
    grid-template-columns: auto auto auto;
    gap: 1.25rem;
    height: 3rem;

    @media (min-width: 950px) {
        grid-template-columns: auto auto auto;
        gap: 1.25rem;
    }
`;
const Copyright = styled.div`
    display: block;
    height: 3rem;
    font-size: 1.25rem;
    font-weight: 800;
    text-transform: uppercase;
    text-align: center;

    @media (min-width: 950px) {
        display: flex;
        justify-content: flex-end;
        align-items: flex-end;
        gap: 0.5rem;
        text-align: right;
    }
`;
const Policy = styled(Link)`
    padding: 1rem 0px;
    font-size: 1.25rem;
    font-weight: 800;
    text-transform: uppercase;
`;
const Socials = styled(ImportantLinks)`
    display: flex;
    height: 3rem;
    justify-content: flex-end;
    align-items: flex-end;
`;
const Social = styled(Link)`
    position: relative;
    width: 2.5rem;
    height: 2.5rem;

    img {
        object-fit: contain;
    }
`;

interface FooterProps {
    store?: StoreModel;
    country?: string;
}
const Footer: FunctionComponent<FooterProps> = (props) => {
    const { store } = props;
    const { data } = useSWR([`footer`], () => FooterApi(), {
        fallbackData: preval.footer
    });

    // FIXME: Dynamic copyright copy.

    // FIXME: Togglable newsletter view.
    return (
        <>
            <EmailCapture />
            <FooterContainer>
                <FooterWrapper>
                    <FooterBlocksContainer>
                        <FooterBlock>
                            <Logo>
                                {store?.logo?.src && (
                                    <Image
                                        src={store.logo.src}
                                        alt="Logo"
                                        fill
                                        loader={ImageLoader}
                                    />
                                )}
                            </Logo>

                            <Address
                                dangerouslySetInnerHTML={{
                                    __html: PrismicDOM.asText(data?.address, '<br />') || ''
                                }}
                            />
                        </FooterBlock>

                        {data?.blocks?.map?.((block) => (
                            <FooterBlock key={block.title}>
                                <BlockTitle>{block.title}</BlockTitle>
                                {block?.items.map((item) => (
                                    <Link
                                        key={item.handle}
                                        href={item.handle}
                                        target={item.handle.startsWith('http') ? '_blank' : ''}
                                    >
                                        {item.title}
                                    </Link>
                                ))}
                            </FooterBlock>
                        ))}
                    </FooterBlocksContainer>

                    {/* TODO: This should be configurable in prismic. */}
                    <FooterBottomSection>
                        <FooterBottomSectionBlock>
                            <AcceptedPaymentMethods store={store!} />
                            <LegalAndCopyright>
                                <ImportantLinks>
                                    <Policy href="mailto:dennis@sweetsideofsweden.com">
                                        Contact Us
                                    </Policy>
                                    <Policy href="/about/">About</Policy>
                                    <Policy href="/privacy-policy/">Privacy Policy</Policy>
                                </ImportantLinks>
                            </LegalAndCopyright>
                        </FooterBottomSectionBlock>

                        <FooterBottomSectionBlock>
                            <Socials>
                                {store?.social
                                    ?.filter((social) =>
                                        ['instagram', 'facebook'].includes(
                                            social.name.toLowerCase()
                                        )
                                    )
                                    .map((social) => (
                                        <Social key={social.url} href={social.url}>
                                            <Image
                                                src={`/assets/icons/social/${social.name.toLowerCase()}.svg`}
                                                fill
                                                alt={social.name}
                                                title={social.name}
                                            />
                                        </Social>
                                    ))}
                            </Socials>
                            <LegalAndCopyright>
                                <Copyright>
                                    <span>&copy; 2020-{new Date().getFullYear()} </span>
                                    <span>
                                        <Link href={`https://${Config.domain}/`}>
                                            {store?.name}
                                        </Link>{' '}
                                        - All rights reserved
                                    </span>
                                </Copyright>
                            </LegalAndCopyright>
                        </FooterBottomSectionBlock>
                    </FooterBottomSection>
                </FooterWrapper>
            </FooterContainer>
        </>
    );
};

export default Footer;
