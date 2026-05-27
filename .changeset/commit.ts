type ReleaseType = 'major' | 'minor' | 'patch' | 'none';

interface Release {
    name: string;
    type: ReleaseType;
    newVersion: string;
}

interface NewChangeset {
    id: string;
    summary: string;
    releases: Array<{ name: string; type: Exclude<ReleaseType, 'none'> }>;
}

interface ReleasePlan {
    releases: Release[];
}

interface CommitOptions {
    skipCI?: boolean | 'add' | 'version';
}

const TERMINAL_PUNCTUATION = /[.!?]$/;

/**
 * Trims trailing whitespace and appends a period when the subject does not
 * already end in terminal punctuation. Enforces the project's commit subject
 * style without mutating sentences that are already well-formed.
 *
 * @param text - Raw subject line authored by the contributor.
 * @returns Subject guaranteed to end in `.`, `!`, or `?` (empty string if blank).
 */
const ensureTrailingPeriod = (text: string): string => {
    const trimmed = text.trim();
    if (!trimmed) {
        return trimmed;
    }
    return TERMINAL_PUNCTUATION.test(trimmed) ? trimmed : `${trimmed}.`;
};

/**
 * Splits markdown-style summary text into paragraphs on blank lines, trimming
 * each block and dropping empties so the result is safe to feed straight into
 * a commit body.
 *
 * @param text - Multi-paragraph summary, possibly containing CRLF or extra blanks.
 * @returns Ordered list of non-empty paragraphs with internal whitespace preserved.
 */
const splitParagraphs = (text: string): string[] =>
    text
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);

/**
 * Reshapes a changeset summary into a conventional-commits subject + body pair.
 * The first paragraph collapses to a single line (subject); remaining
 * paragraphs are preserved verbatim as the body.
 *
 * @param summary - Full changeset summary as written by the contributor.
 * @returns Subject (single line, period-terminated) and optional body text.
 */
const formatSummary = (summary: string | undefined): { subject: string; body: string } => {
    const paragraphs = splitParagraphs(summary ?? '');
    if (paragraphs.length === 0) {
        return { subject: '', body: '' };
    }
    const first = paragraphs[0] ?? '';
    const subject = ensureTrailingPeriod(first.replace(/\s+/g, ' '));
    const body = paragraphs.slice(1).join('\n\n');
    return { subject, body };
};

/**
 * Generates the commit message used when `changeset add` writes a new changeset
 * file. Produces `docs(changeset): <subject>.` plus the remainder of the
 * summary as a conventional commit body.
 *
 * @param changeset - The newly authored changeset record.
 * @param options - Commit options from `.changeset/config.json`.
 * @returns Conventional commit message conforming to the project's `CLAUDE.md` rules.
 */
const getAddMessage = async (changeset: NewChangeset, options?: CommitOptions): Promise<string> => {
    const { subject, body } = formatSummary(changeset.summary);
    const head = `docs(changeset): ${subject}`;
    return body ? `${head}\n\n${body}` : head;
};

/**
 * Generates the commit message used when `changeset version` bumps package
 * versions. Produces `chore(release): version packages.` with the list of
 * published packages and their new versions in the body.
 *
 * @param releasePlan - Release plan computed by changesets.
 * @param options - Commit options from `.changeset/config.json`.
 * @returns Conventional commit message describing the release.
 */
const getVersionMessage = async (releasePlan: ReleasePlan, options?: CommitOptions): Promise<string> => {
    const publishable = releasePlan.releases.filter((release) => release.type !== 'none');
    const releaseLines = publishable.map((release) => `  ${release.name}@${release.newVersion}`).join('\n');
    const header = 'chore(release): version packages.';
    const body = releaseLines ? `Releases:\n${releaseLines}` : '';
    return body ? `${header}\n\n${body}` : header;
};

export default {
    getAddMessage,
    getVersionMessage,
};
