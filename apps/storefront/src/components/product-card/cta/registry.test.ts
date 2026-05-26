import { describe, expect, it } from 'vitest';
import { getProductCardCta, registerProductCardCta } from './registry';

describe('CTA registry', () => {
  it('returns the registered component when looked up by name', () => {
    const FakeCta = () => null;
    registerProductCardCta('fake-test-key', FakeCta);
    expect(getProductCardCta('fake-test-key')).toBe(FakeCta);
  });

  it('falls back to float-pill when the name is unknown', () => {
    const FloatPill = () => null;
    registerProductCardCta('float-pill', FloatPill);
    expect(getProductCardCta('absent')).toBe(FloatPill);
  });
});
