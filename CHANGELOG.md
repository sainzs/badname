# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-08-17

### Added

- Corpus v1: 150 curated pathological paths across 19 categories
  (normalization twins, combining marks, emoji ZWJ, bidi, control characters,
  BOM/invisibles, Windows-reserved names, trailing separators, separator
  lookalikes, length limits, case collisions, locale casing, width twins,
  CLI/glob hazards, whitespace lookalikes, deep nesting, legacy mojibake,
  NTFS streams, dash confusables), each with per-platform creatability
  metadata and a one-line rationale.
- `pathological check` — read-only tree scan for corpus hazards, with exact /
  normalization / case / compatibility matching. Singleton hazards always
  report; twin pairs report only on real same-directory collisions (lone
  twins are clean; `--all` for full strictness). CI-friendly exit codes and
  `--json`.
- `pathological seed` — sandbox fixture materialization with platform-aware
  skipping, traversal validation, and collision *findings* on
  normalization/case-insensitive volumes.
- `pathological roundtrip` — run any shell command inside a seeded sandbox and
  report renamed / normalized / case-folded / missing fixtures.
- `pathological list` — corpus listing with invisible characters escaped.
- Deterministic corpus builder (`scripts/build-corpus.js`) with drift check;
  `corpus.json` and `PLAIN.txt` are generated, committed artifacts.
- Test suite (29 tests) and 3-OS CI matrix (ubuntu / macOS / Windows).

[0.1.0]: https://github.com/sainzs/pathological/releases/tag/v0.1.0
