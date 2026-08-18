# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] — 2026-08-17

### Fixed

- Windows platform metadata: ASCII control characters, `*?|>"` characters,
  and Win32-stripped trailing-space/spaces-only names are POSIX-only entries
  (NTFS forbids or mangles them) — the Windows CI leg now passes.
- `.gitattributes` pins `eol=lf` and the corpus drift check tolerates CRLF,
  so Windows checkouts no longer report phantom corpus drift.

### Documented

- Real finding, verified on GitHub's macos-latest runners: bsdtar
  (libarchive) writes pax headers in NFC, so NFD fixture names come back
  NFC-normalized after a tar roundtrip. Recorded in the corpus `why` notes
  and tolerated (byte-exactness still enforced on Linux).

## [0.1.0] — 2026-08-17

### Added

- Corpus v1: 150 curated pathological paths across 19 categories
  (normalization twins, combining marks, emoji ZWJ, bidi, control characters,
  BOM/invisibles, Windows-reserved names, trailing separators, separator
  lookalikes, length limits, case collisions, locale casing, width twins,
  CLI/glob hazards, whitespace lookalikes, deep nesting, legacy mojibake,
  NTFS streams, dash confusables), each with per-platform creatability
  metadata and a one-line rationale.
- `memex check` — read-only tree scan for corpus hazards, with exact /
  normalization / case / compatibility matching. Singleton hazards always
  report; twin pairs report only on real same-directory collisions (lone
  twins are clean; `--all` for full strictness). CI-friendly exit codes and
  `--json`.
- `memex seed` — sandbox fixture materialization with platform-aware
  skipping, traversal validation, and collision *findings* on
  normalization/case-insensitive volumes.
- `memex roundtrip` — run any shell command inside a seeded sandbox and
  report renamed / normalized / case-folded / missing fixtures.
- `memex list` — corpus listing with invisible characters escaped.
- Deterministic corpus builder (`scripts/build-corpus.js`) with drift check;
  `corpus.json` and `PLAIN.txt` are generated, committed artifacts.
- Test suite (29 tests) and 3-OS CI matrix (ubuntu / macOS / Windows).

[0.1.1]: https://github.com/sainzs/memex/releases/tag/v0.1.1
[0.1.0]: https://github.com/sainzs/memex/releases/tag/v0.1.0
