import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '@/utils/tailwind';

const Header = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
    <header
        ref={ref}
        className={cn('mb-4 flex w-full flex-col border-0 border-b-2 border-solid p-4', className)}
        {...props}
    />
));
const Footer = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
    <footer
        ref={ref}
        className={cn('mt-4 flex w-full items-center border-0 border-t-2 border-solid p-4', className)}
        {...props}
    />
));
const Content = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn('w-full px-4 first:pt-4 last:pb-4', className)} {...props} />
));

type CardProps = {} & HTMLAttributes<HTMLDivElement>;
export const Card = Object.assign(
    forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => (
        <section
            ref={ref}
            className={cn('bg-card text-card-foreground rounded-lg border-2 border-solid shadow-sm', className)}
            {...props}
        />
    )),
    {
        displayName: 'Card',
        header: Object.assign(Header, {
            displayName: 'Card.Header'
        }),
        footer: Object.assign(Footer, {
            displayName: 'Card.footer'
        }),
        content: Object.assign(Content, {
            displayName: 'Card.content'
        })
    }
);
