import { Button, Header as NordstarHeader } from '@nordcom/nordstar';
import Image from 'next/image';
import Link from 'next/link';
import type { HTMLProps } from 'react';
import logo from '@/static/logo.svg';
import { getAdminHostname } from '@/utils/domains';
import { cn } from '@/utils/tailwind';

export type HeaderProps = {} & Omit<HTMLProps<HTMLDivElement>, 'children' | 'color' | 'as'>;
/**
 * Renders the site navigation header with the Nordcom Commerce logo, nav links, and a Log in CTA. The
 * landing app carries no session of its own — the CTA hands off to the admin origin
 * (`admin.<SERVICE_DOMAIN>`), which routes unauthenticated visitors to sign in.
 *
 * @param props.className - Additional CSS classes merged onto the header root element.
 */
export default async function Header({ className, ...props }: HeaderProps) {
    return (
        <NordstarHeader {...props} className={cn('[grid-area:header]', className)}>
            <NordstarHeader.Logo>
                <Link href="/" title="Nordcom Commerce" className="flex h-full items-center">
                    <Image
                        className="h-7 w-auto md:h-8"
                        src={logo}
                        alt="Nordcom Commerce"
                        height={37}
                        width={123}
                        draggable={false}
                        decoding="async"
                        priority={true}
                    />
                </Link>
            </NordstarHeader.Logo>

            <NordstarHeader.Menu>
                <NordstarHeader.Menu.Link as={Link} href="/news/">
                    News
                </NordstarHeader.Menu.Link>
                <NordstarHeader.Menu.Link as={Link} href="/docs/">
                    Documentation
                </NordstarHeader.Menu.Link>

                <Button as={Link} href={`https://${getAdminHostname()}/`} color="primary">
                    Log in
                </Button>
            </NordstarHeader.Menu>
        </NordstarHeader>
    );
}
