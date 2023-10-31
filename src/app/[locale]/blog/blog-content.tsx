'use client';

import type { Locale, LocaleDictionary } from '@/utils/locale';

import { styled } from 'styled-components';

const Container = styled.main``;

type BlogContentProps = {
    locale: Locale;
    i18n: LocaleDictionary;
};
export default function BlogsContent({ locale, i18n }: BlogContentProps) {
    return <Container></Container>;
}
