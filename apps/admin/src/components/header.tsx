import Image from 'next/image';
import Link from 'next/link';

export type HeaderProps = {};
export function Header({}) {
    return (
        <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 border-border top-0 z-40 flex items-center justify-between border-0 border-b border-solid p-4 backdrop-blur lg:sticky">
            <Link href="/" title="Nordcom Commerce">
                <Image
                    className="h-8 object-contain object-left"
                    src="https://shops.nordcom.io/logo.svg"
                    alt="Nordcom AB's Logo"
                    height={75}
                    width={150}
                    draggable={false}
                    decoding="async"
                    priority={true}
                    loader={undefined}
                />
            </Link>

            <div className="flex gap-2">
                <div>action</div>
            </div>
        </header>
    );
}
