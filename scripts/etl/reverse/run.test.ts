import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import type { Doc } from '../transform/id-remap';
import { type SourceDataset, transform } from '../transform/index';
import { invertSnapshot, snapshotFromStaged } from './invert';
import type { RoundTripReport } from './round-trip';
import {
    buildMongoimportArgs,
    readCorpus,
    readSnapshotDataset,
    reportExitCode,
    serializeRestoreCollection,
    writeRestoreFiles,
} from './run';

/** Temp directories created per test, cleaned up afterwards. */
const tempDirs: string[] = [];

/** Creates a tracked temp directory. */
const tempDir = (): string => {
    const dir = mkdtempSync(join(tmpdir(), 'etl-reverse-'));
    tempDirs.push(dir);
    return dir;
};

afterEach(() => {
    while (tempDirs.length > 0) {
        const dir = tempDirs.pop();
        if (dir) rmSync(dir, { recursive: true, force: true });
    }
});

/** A one-line-per-document JSONL render of `docs`. */
const jsonl = (docs: readonly Doc[]): string => `${docs.map((doc) => JSON.stringify(doc)).join('\n')}\n`;

/** A minimal single-tenant corpus for the I/O round trips. */
const corpus: SourceDataset = {
    shops: [
        {
            _id: { $oid: '6630f1a2b3c4d5e6f7a8b9d1' },
            name: 'Disk Shop',
            domain: 'disk.example.com',
            design: { header: { logo: { width: 1, height: 1, src: 'https://cdn/l.png', alt: 'D' } }, accents: [] },
            createdAt: { $date: '2024-04-30T00:00:00.000Z' },
            updatedAt: { $date: '2024-05-01T00:00:00.000Z' },
        },
    ],
    featureFlags: [],
    reviews: [
        {
            _id: { $oid: '6630f1a2b3c4d5e6f7a8b9f1' },
            shop: { $oid: '6630f1a2b3c4d5e6f7a8b9d1' },
            createdAt: { $date: '2024-05-02T00:00:00.000Z' },
            updatedAt: { $date: '2024-05-02T00:00:00.000Z' },
        },
    ],
};

describe('readCorpus', () => {
    it('reads present collections and skips absent files', () => {
        const dir = tempDir();
        writeFileSync(resolve(dir, 'shops.jsonl'), jsonl(corpus.shops ?? []));
        writeFileSync(resolve(dir, 'reviews.jsonl'), jsonl(corpus.reviews ?? []));
        const dataset = readCorpus(dir);
        expect(dataset.shops).toHaveLength(1);
        expect(dataset.reviews).toHaveLength(1);
        expect(dataset.featureFlags).toBeUndefined();
    });
});

describe('readSnapshotDataset', () => {
    it('reads both the flat and the unzipped-convex-export layouts', () => {
        const dir = tempDir();
        const snapshot = snapshotFromStaged(transform(corpus));
        writeFileSync(resolve(dir, 'shops.jsonl'), jsonl(snapshot.shops ?? []));
        mkdirSync(resolve(dir, 'reviews'), { recursive: true });
        writeFileSync(resolve(dir, 'reviews', 'documents.jsonl'), jsonl(snapshot.reviews ?? []));
        const dataset = readSnapshotDataset(dir);
        expect(dataset.shops).toHaveLength(1);
        expect(dataset.reviews).toHaveLength(1);
        expect(dataset.users).toBeUndefined();
    });
});

describe('writeRestoreFiles + serializeRestoreCollection', () => {
    it('stages only non-empty collections as parseable mongoimport JSONL', () => {
        const out = tempDir();
        const result = invertSnapshot(snapshotFromStaged(transform(corpus)));
        const written = writeRestoreFiles(result, resolve(out, 'mongo-restore'));
        expect(written.map((entry) => entry.collection)).toEqual(['shops', 'reviews']);
        for (const entry of written) {
            const lines = readFileSync(entry.file, 'utf8').trim().split('\n');
            expect(lines).toHaveLength(entry.rows);
            const first = JSON.parse(lines[0] ?? '') as Doc;
            expect(first._id).toEqual({ $oid: expect.stringMatching(/^[0-9a-f]{24}$/) });
        }
    });

    it('serializes an empty collection to an empty payload', () => {
        expect(serializeRestoreCollection([])).toBe('');
    });
});

describe('buildMongoimportArgs', () => {
    it('replaces the target collection wholesale (--drop), never merging', () => {
        expect(buildMongoimportArgs('mongodb://restore', 'shops', '/tmp/shops.jsonl')).toEqual([
            '--uri=mongodb://restore',
            '--collection=shops',
            '--type=json',
            '--drop',
            '--file=/tmp/shops.jsonl',
        ]);
    });
});

describe('reportExitCode', () => {
    /** A minimal report shell with the given verdict fields. */
    const report = (ok: boolean, documents: number): RoundTripReport => ({
        collections: [],
        reverseDivergences: [],
        documents,
        ok,
    });

    it('is zero only for a green, NON-EMPTY comparison', () => {
        expect(reportExitCode(report(true, 10))).toBe(0);
        expect(reportExitCode(report(true, 0))).toBe(1);
        expect(reportExitCode(report(false, 10))).toBe(1);
    });
});
