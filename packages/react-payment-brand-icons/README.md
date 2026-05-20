# react-payment-brand-icons

Tree-shakeable React components for payment-method brand icons (Visa, Mastercard, Apple Pay, Swish, and 460+ more).

## Installation

```bash
npm install react-payment-brand-icons
# or
pnpm add react-payment-brand-icons
```

## Requirements

- React 18 or 19

## Usage

```tsx
import { VisaIcon } from 'react-payment-brand-icons/icons/visa';

export default function Checkout() {
    return <VisaIcon width={48} height={32} />;
}
```

You can also import from the barrel (larger bundle — tree-shaking recommended):

```tsx
import { VisaIcon, MastercardIcon } from 'react-payment-brand-icons';
```

## Icon manifest

The manifest lists every available icon slug and its display name:

```ts
import { manifest } from 'react-payment-brand-icons/manifest';

console.log(manifest);
// [{ slug: 'visa', name: 'Visa' }, { slug: 'mastercard', name: 'Mastercard' }, ...]
```

## Props

Every icon component accepts standard SVG props (`width`, `height`, `className`, `style`, `aria-label`, etc.).

| Prop        | Type     | Default |
| ----------- | -------- | ------- |
| `width`     | `number` | `38`    |
| `height`    | `number` | `24`    |
| `className` | `string` | —       |

## Available icons

<!-- BEGIN_ICON_LIST -->
<!-- END_ICON_LIST -->

## License

MIT © [Nordcom AB](https://nordcom.io/)
