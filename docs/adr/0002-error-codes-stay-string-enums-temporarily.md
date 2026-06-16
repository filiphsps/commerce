# Error codes stay string-valued enums + switch, test-guarded — temporarily

Error codes are string-valued `*ErrorKind` enum members (the member name written twice, `API_X = 'API_X'`), resolved to classes via a hand-written `getErrorFromCode` switch — three hand-maintained registration points per error (member + class + switch case), the pattern CLAUDE.md documents. A value drift (`API_METHOD_NOT_ALLOWED` carrying the wrong code, `API_IMAGE_NO_FRACTIONAL` pointing at a non-existent member) shipped silently because the runtime `.code`, the `/errors/<code>/` URL, `getErrorFromCode`, and the docs catalogue all key off the value.

We keep the enum + switch pattern for now and guard it with invariant tests (value === name, code uniqueness, `getErrorFromCode` round-trip) rather than refactor to a derived `code → { class }` registry. The enums are a published API consumed across the monorepo, so a registry rewrite is breaking and was out of scope for the bugfix.

This is explicitly temporary. As more error kinds are added the duplication and the hand-maintained enum list stop scaling; at that point we consolidate to a single registry that derives the union, `getAllErrorCodes`, and `getErrorFromCode` from one source, making name === value structural rather than test-asserted.

## Consequences

- The new tests fully guard the common case (a new code in an existing enum) but anchor on a hand-listed set of two enums (`GenericErrorKind`, `ApiErrorKind`). A *new* `*ErrorKind` enum slips all three checks silently — the same drift class, one level up.
- Near-term mitigation (cheap, non-breaking): derive the guard and docs-catalogue list from one exported `ERROR_KINDS` array that `getAllErrorCodes`, the catalogue, and the `it.each` all consume, so a new enum is auto-covered.
