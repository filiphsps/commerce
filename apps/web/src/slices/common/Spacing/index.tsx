import type { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';
import styles from './spacing.module.scss';

/**
 * Props for `Spacing`.
 */
export type SpacingProps = SliceComponentProps<Content.SpacingSlice>;

/**
 * Component for "Spacing" Slices.
 */
const Spacing = ({ slice }: SpacingProps): JSX.Element => {
    return (
        <section className={styles.container} data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
            {((slice) => {
                switch (slice.variation) {
                    case 'custom':
                        return <div style={{ height: `calc(var(--block-spacer) * ${slice.primary.scaling || 2})` }} />;
                    case 'small':
                        return <div style={{ height: 'var(--block-spacer)' }} />;
                    case 'large':
                        return <div style={{ height: 'calc(var(--block-spacer) * 4)' }} />;

                    // TODO: Maybe we should throw on default.
                    default:
                    case 'normal':
                        return <div style={{ height: 'calc(var(--block-spacer) * 2)' }} />;
                }
            })(slice)}
        </section>
    );
};

export default Spacing;
