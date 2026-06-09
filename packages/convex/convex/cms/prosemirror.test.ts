import { describe, expect, it } from 'vitest';

import { parseRichTextSyncDocumentId, richTextSyncDocumentId } from './prosemirror';

/**
 * Probes the pure id codec binding a localized rich-text bucket to a prosemirror-sync document. The
 * round-trip and the rejection cases are the contract the public sync endpoints' permission checks
 * lean on: a malformed id resolves to `null`, which they turn into the typed `MALFORMED_DOCUMENT_ID`
 * failure, and a well-formed id always recovers the tenant segment they authorize against.
 */
describe('rich-text sync document id', () => {
    const address = { shopId: 'shop_abc', documentId: 'doc_123', fieldPath: 'body', locale: 'en-US' };

    it('round-trips an address through a tenant-prefixed id', () => {
        const id = richTextSyncDocumentId(address);
        expect(id).toBe('rt:shop_abc:doc_123:body:en-US');
        expect(parseRichTextSyncDocumentId(id)).toEqual(address);
    });

    it('rejects an id that is not tagged as rich-text', () => {
        expect(parseRichTextSyncDocumentId('xx:shop_abc:doc_123:body:en-US')).toBeNull();
    });

    it('rejects an id with the wrong segment count', () => {
        expect(parseRichTextSyncDocumentId('rt:shop_abc:doc_123:body')).toBeNull();
        expect(parseRichTextSyncDocumentId('rt:shop_abc:doc_123:body:en-US:extra')).toBeNull();
    });

    it('rejects an id with an empty addressing segment', () => {
        expect(parseRichTextSyncDocumentId('rt:shop_abc::body:en-US')).toBeNull();
    });
});
