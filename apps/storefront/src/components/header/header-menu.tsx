/**
 * Legacy Prismic-driven header menu. Renders nothing while the CMS Header
 * global is wired into the storefront. Menu data will come from
 * @nordcom/commerce-cms/api: getHeader (recursive nav-item field) in a follow-up.
 */
export type HeaderMenuProps = {
    slices: unknown[];
};

export function HeaderMenu(_props: HeaderMenuProps) {
    return null;
}
