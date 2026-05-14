// Tag segments are joined with ".", so any literal "." in a segment must be encoded.
// We also encode ":" because the qualifier separator uses "::". Beyond those two,
// encodeURIComponent handles the long tail (spaces, slashes, emoji, etc.).
export function encodeSegment(value: string | number): string {
	const str = typeof value === 'number' ? String(value) : value;
	return encodeURIComponent(str)
		.replace(/\./g, '%2E')
		.replace(/:/g, '%3A');
}

export function joinSegments(segments: ReadonlyArray<string | number>): string {
	const out: string[] = [];
	for (const seg of segments) {
		const encoded = encodeSegment(seg);
		if (!encoded) {
			throw new Error(`tagtree: empty segment in tag (segments: ${JSON.stringify(segments)})`);
		}
		out.push(encoded);
	}
	return out.join('.');
}
