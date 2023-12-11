'use client';

import { AcceptedPaymentMethods } from '@/components/AcceptedPaymentMethods';
import { CurrentLocaleFlag } from '@/components/informational/current-locale-flag';
import Link from '@/components/link';
import { PrismicText } from '@/components/typography/prismic-text';
import type { FooterModel } from '@/models/FooterModel';
import type { StoreModel } from '@/models/StoreModel';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { useTranslation } from '@/utils/locale';
import Image from 'next/image';
import styled from 'styled-components';
import styles from './footer.module.scss';

const Logo = styled.div`
    position: relative;
    display: block;
    width: 100%;
    height: 5rem;
    margin: 0 0 1rem 0;

    img {
        display: block;
        height: 100%;
        width: 100%;
        object-fit: contain;
        object-position: left;
    }
`;
const Address = styled.address`
    font-size: 1.5rem;
    line-height: normal;
    font-weight: 400;

    @media (min-width: 950px) {
        font-size: 1.25rem;
    }
`;

const FooterBlocksContainer = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 2rem;
    justify-content: space-between;
    align-items: center;
    text-align: left;

    @media (min-width: 950px) {
        display: flex;
        gap: var(--block-spacer-large);
    }
`;
const FooterBlock = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    flex-direction: column;
    width: 100%;
    height: 100%;

    font-size: 1.75rem;
    line-height: 1.15;
    font-weight: 400;

    a {
        font-weight: inherit;
        margin-bottom: var(--block-spacer);
    }

    @media (min-width: 950px) {
        justify-content: flex-start;

        font-size: 1.5rem;
        line-height: 1;

        a {
            margin-bottom: calc(var(--block-spacer) / 1.5);
        }
    }
`;

const BlockTitle = styled.div`
    font-size: 2.5rem;
    line-height: normal;
    font-weight: 600;
    margin-bottom: var(--block-spacer-large);

    @media (min-width: 950px) {
        margin-bottom: var(--block-spacer-small);
    }
`;

const LegalAndCopyright = styled.div`
    margin: var(--block-spacer-large) 0;

    @media (min-width: 950px) {
        height: 4rem;
        margin: 0;
    }
`;
const FooterBottomSection = styled.section`
    display: grid;
    grid-template-columns: 1fr;
    padding-top: var(--block-spacer-large);
    gap: var(--block-spacer-small);

    @media (min-width: 950px) {
        grid-template-columns: 1fr 1fr;
    }
`;
const FooterBottomSectionBlock = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: flex-start;
    gap: var(--block-spacer);

    &:nth-child(2) {
        align-items: flex-start;

        @media (min-width: 950px) {
            align-items: flex-end;
        }
    }

    @media (min-width: 950px) {
        justify-content: flex-end;
        align-items: flex-start;
        gap: 0.5em;
        gap: var(--block-spacer-large);
    }
`;
const ImportantLinks = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: var(--block-spacer);

    @media (min-width: 950px) {
        display: grid;
        grid-template-columns: auto auto auto;
        gap: var(--block-spacer-large);
        height: 3rem;
    }
`;

const Copyright = styled.div`
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    line-height: normal;
    text-transform: uppercase;
    text-align: left;

    @media (min-width: 950px) {
        display: flex;
        justify-content: flex-end;
        align-items: flex-end;
        gap: var(--block-spacer-small);
        font-weight: 800;
        text-align: right;
        height: 3rem;
        font-size: 1.25rem;
    }
`;
const Policy = styled(Link)`
    font-size: 1.5rem;
    font-weight: 700;
    text-transform: uppercase;

    @media (min-width: 950px) {
        padding: var(--block-padding-large) 0;
        font-weight: 800;
        font-size: 1.25rem;
    }
`;
const Socials = styled(ImportantLinks)`
    display: flex;
    height: 3rem;
    width: 100%;

    @media (min-width: 950px) {
        justify-content: flex-end;
        align-items: flex-end;
    }
`;
const Social = styled(Link)`
    position: relative;
    width: 3.5rem;
    height: 3.5rem;

    @media (min-width: 950px) {
        width: 2.5rem;
        height: 2.5rem;
    }

    img {
        object-fit: contain;
    }
`;

export type FooterContentProps = {
    locale: Locale;
    i18n: LocaleDictionary;
    store: StoreModel;
    data: FooterModel;
};
export const FooterContent = ({ locale, i18n, store, data: footer }: FooterContentProps) => {
    const { t } = useTranslation('common', i18n);

    const year = new Date().getFullYear();

    return (
        <>
            <FooterBlocksContainer>
                <FooterBlock>
                    <Logo>
                        {store.logos?.primary?.src && (
                            <Image
                                src={store.logos.primary.src}
                                alt={store.logos.primary.alt || 'Logo'}
                                fill
                                sizes="(max-width: 950px) 75px, 250px"
                            />
                        )}
                    </Logo>

                    <Address>
                        <PrismicText data={footer.address} />
                    </Address>
                </FooterBlock>

                {footer.blocks?.map?.((block) => (
                    <FooterBlock key={block.title}>
                        <BlockTitle>{block.title}</BlockTitle>
                        {block?.items.map((item: any) => (
                            <Link
                                key={item.handle}
                                href={item.handle || ''}
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
                    <div className={styles['status-badge']}>
                        <iframe
                            title="Nordcom Status"
                            src="https://status.nordcom.io/badge?theme=dark"
                            width="auto"
                            height="30"
                            frameBorder="0"
                            scrolling="no"
                            loading="lazy"
                        />
                    </div>
                    <AcceptedPaymentMethods store={store!} />
                    <LegalAndCopyright>
                        <ImportantLinks>
                            <Policy href="/contact/">Contact</Policy>
                            <Policy href="https://nordcom.io/legal/terms-of-service/" target="_blank">
                                Terms of Service
                            </Policy>
                            <Policy href="/privacy-policy/">Privacy Policy</Policy>
                        </ImportantLinks>
                    </LegalAndCopyright>
                </FooterBottomSectionBlock>

                <FooterBottomSectionBlock>
                    <Socials
                    // TODO: Add LinkedIn and YouTube icons.
                    >
                        {store?.social
                            .filter(({ name }) => !['linkedin', 'youtube'].includes(name.toLowerCase()))
                            .map((social) => (
                                <Social className={styles['social-icon']} key={social.url} href={social.url}>
                                    <Image
                                        src={`/assets/icons/social/${social.name.toLowerCase()}.svg`}
                                        fill
                                        alt={social.name}
                                        title={social.name}
                                        sizes="35px"
                                    />
                                </Social>
                            ))}
                        <Link className={styles.flag} href="/countries/" title={t('language-and-region-settings')}>
                            <CurrentLocaleFlag locale={locale} />
                        </Link>
                    </Socials>
                    <LegalAndCopyright>
                        <Copyright>
                            <span>&copy; {`${year !== 2023 ? '2023-' : ''}${year} `}</span>
                            <span>
                                <Link href={`https://nordcom.io/`} target="_blank">
                                    Nordcom Group Inc.
                                </Link>
                            </span>
                        </Copyright>
                    </LegalAndCopyright>
                </FooterBottomSectionBlock>
            </FooterBottomSection>
        </>
    );
};
