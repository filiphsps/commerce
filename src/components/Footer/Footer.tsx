import { asText } from '@prismicio/client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FunctionComponent } from 'react';
import styled from 'styled-components';
import useSWR from 'swr';
import preval from '../../../src/data.preval';
import { FooterApi } from '../../api/footer';
import type { StoreModel } from '../../models/StoreModel';
import { Config } from '../../util/Config';
import { ImageLoader } from '../../util/ImageLoader';
import { AcceptedPaymentMethods } from '../AcceptedPaymentMethods';

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
    color: var(--accent-primary-text);
    padding-top: 1rem;

    a {
        transition: 250ms ease-in-out;

        @media (hover: hover) and (pointer: fine) {
            &:hover {
                color: var(--accent-secondary-dark);
            }
        }
    }
`;
const FooterWrapper = styled.div`
    display: grid;
    grid-template-rows: auto 1fr;
    gap: 1.5rem;
    width: 1465px;
    max-width: 100%;
    padding: var(--block-padding-large);
`;
const FooterBlocksContainer = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    text-align: left;
    gap: var(--block-spacer);

    @media (max-width: 950px) {
        display: grid;
        grid-template-columns: 1fr;
        gap: 2rem;
    }
`;
const FooterBlock = styled.div`
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: 0.25rem;
    width: 100%;
    height: 100%;

    font-size: 1.5rem;
    line-height: 1.75rem;
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
    padding-top: 1rem;

    @media (min-width: 950px) {
        grid-template-columns: 1fr 1fr;
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
        gap: var(--block-spacer-small);
        text-align: right;
    }
`;
const Policy = styled(Link)`
    padding: var(--block-padding-large) 0px;
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
    const router = useRouter();
    const { store } = props;

    const { data: footer } = useSWR(
        [
            'FooterApi',
            {
                locale: router.locale
            }
        ],
        ([, props]) => FooterApi(props),
        {
            fallbackData: preval.footer!
        }
    );

    // FIXME: Dynamic copyright copy.
    // FIXME: Togglable newsletter view.

    return (
        <FooterContainer>
            <FooterWrapper>
                <FooterBlocksContainer>
                    <FooterBlock>
                        <Logo>
                            {store?.logo?.src && (
                                <Image
                                    src={store?.logo.src}
                                    alt="Logo"
                                    fill
                                    sizes="(max-width: 950px) 75px, 250px"
                                    loader={ImageLoader}
                                />
                            )}
                        </Logo>

                        <Address
                            dangerouslySetInnerHTML={{
                                __html: asText(footer?.address, '<br />') || ''
                            }}
                        />
                    </FooterBlock>

                    {footer?.blocks?.map?.((block) => (
                        <FooterBlock key={block.title}>
                            <BlockTitle>{block.title}</BlockTitle>
                            {block?.items.map((item) => (
                                <Link
                                    key={item.handle}
                                    href={item.handle || ''}
                                    target={item.handle.startsWith('http') ? '_blank' : ''}
                                    prefetch={false}
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
                                <Policy href="mailto:dennis@sweetsideofsweden.com">Contact Us</Policy>
                                <Policy href="/about/" prefetch={false}>
                                    About
                                </Policy>
                                <Policy href="/privacy-policy/" prefetch={false}>
                                    Privacy Policy
                                </Policy>
                            </ImportantLinks>
                        </LegalAndCopyright>
                    </FooterBottomSectionBlock>

                    <FooterBottomSectionBlock>
                        <Socials>
                            {store?.social
                                ?.filter((social) =>
                                    ['instagram', 'facebook', 'twitter'].includes(social.name.toLowerCase())
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
                                    <Link href={`https://${Config.domain}/`} prefetch={false}>
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
    );
};

export default Footer;
