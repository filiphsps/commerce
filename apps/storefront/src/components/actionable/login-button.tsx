'use client';

import { capitalize, getTranslations } from '@/utils/locale';
import { User as UserIcon } from 'lucide-react';
import { signIn } from 'next-auth/react';

import { Button } from '@/components/actionable/button';

import type { LocaleDictionary } from '@/utils/locale';

export type LoginButtonProps = {
    i18n: LocaleDictionary;
};
export function LoginButton({ i18n }: LoginButtonProps) {
    const { t } = getTranslations('common', i18n);

    return (
        <Button
            onClick={() =>
                signIn('shopify', {
                    redirectTo: '/account/'
                })
            }
            styled={false}
            title={capitalize(t('login'))}
            className="hover:text-primary focus-visible:text-primary transition-colors"
        >
            <UserIcon className="stroke-1 text-xl lg:text-2xl" />
        </Button>
    );
}
LoginButton.displayName = 'Nordcom.Actionable.LoginButton';
