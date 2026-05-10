import type { As } from '@nordcom/nordstar';
import type { ComponentProps, CSSProperties, ElementType, FunctionComponent, HTMLProps, JSX, ReactNode } from 'react';
import { Fragment } from 'react';
import { cn } from '@/utils/tailwind';

export type TitleProps<T extends As> = {
    as?: ElementType;
    children?: ReactNode;
    bold?: boolean;
} & ComponentProps<T>;
export const Title = <T extends As>({ as: Tag = 'h1' as T, bold, className, key, ...props }: TitleProps<T>) => {
    if (!props.children) return null;
    if (Tag === null) {
        return <Fragment key={key}>{props.children}</Fragment>;
    }

    const AsComponent = Tag || ('h1' as keyof JSX.IntrinsicElements);
    return (
        <AsComponent
            key={key}
            {...props}
            className={cn(
                'font-medium text-3xl leading-snug md:text-4xl',
                props.href && 'cursor-pointer hover:text-primary focus-visible:text-primary',
                bold && 'font-bold text-primary',
                props.href && bold && 'hover:underline focus-visible:underline',
                className,
            )}
        />
    );
};

export type SubTitleProps = {
    children?: ReactNode;
    as?: ElementType | null;
    bold?: boolean;
} & Omit<HTMLProps<HTMLDivElement>, 'as'>;
export const SubTitle = ({ as, bold, className, key, ...props }: SubTitleProps) => {
    if (as === null) {
        return <Fragment key={key}>{props.children}</Fragment>;
    }

    const fallback: keyof JSX.IntrinsicElements = 'div';
    const AsComponent = as || fallback;

    return (
        <AsComponent
            key={key}
            {...props}
            className={cn(
                'text-gray-500 text-lg md:text-xl',
                props.href && 'cursor-pointer hover:text-primary focus-visible:text-primary',
                bold && 'font-extrabold',
                props.href && bold && 'hover:underline focus-visible:underline',
                className,
            )}
        />
    );
};

type TitlePropFields = {
    title?: ReactNode;
    titleAs?: ElementType | null;
    titleStyle?: CSSProperties;
    titleClassName?: string;
    titleProps?: ComponentProps<ElementType>;
};
type SubPropFields = {
    subtitle?: ReactNode;
    subtitleAs?: ElementType | null;
    subtitleStyle?: CSSProperties;
    subtitleClassName?: string;
};

type HeadingProps = {
    bold?: boolean;
} & (
    | (TitlePropFields &
          SubPropFields & {
              wrapper?: FunctionComponent<{ children: ReactNode | undefined }>;
              reverse?: boolean;
          })
    | TitlePropFields
    | SubPropFields
);

const Heading = ({ bold, ...props }: HeadingProps) => {
    let titleElement: ReactNode | null = null;
    if ('title' in props) {
        const { title, titleAs, titleStyle, titleClassName, titleProps } = props;
        titleElement = (
            <Title bold={bold} as={titleAs} style={titleStyle} className={titleClassName} {...(titleProps || {})}>
                {title}
            </Title>
        );

        if (!('subtitle' in props)) {
            return titleElement;
        }
    }

    let subtitleElement: ReactNode | null = null;
    if ('subtitle' in props) {
        const { subtitle, subtitleAs, subtitleStyle, subtitleClassName } = props;
        subtitleElement = (
            <SubTitle bold={bold} as={subtitleAs} style={subtitleStyle} className={subtitleClassName}>
                {subtitle}
            </SubTitle>
        );

        if (!('title' in props)) {
            return subtitleElement;
        }
    }

    if ((!titleElement && !subtitleElement) || !('title' in props && 'subtitle' in props)) {
        return null;
    }

    const { reverse, wrapper: Wrapper } = props;
    const headingSet = !reverse ? (
        <>
            {titleElement}
            {subtitleElement}
        </>
    ) : (
        <>
            {subtitleElement}
            {titleElement}
        </>
    );

    if (Wrapper) {
        return <Wrapper>{headingSet}</Wrapper>;
    }
    return <div className="flex flex-col gap-1">{headingSet}</div>;
};

export default Heading;
