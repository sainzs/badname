# badname — Agent Notes

The shared corpus of pathological file paths + a harness to test tools
against them. Zero runtime dependencies, Node ≥ 20. Definition of done:
`npm run check` passes (corpus in sync + tests + clean self-scan).

## Commands

```sh
npm run check          # corpus:validate + tests + badname check .  (CI parity)
npm test               # node --test
npm run corpus:build   # regenerate corpus/corpus.json + corpus/PLAIN.txt
npm run corpus:validate # drift check only (no writes)
node bin/badname.js check [dir] [--json]
node bin/badname.js seed [dir] [--category X]
node bin/badname.js roundtrip -- '<shell cmd>'
node bin/badname.js list [--category X]
```

## Architecture

Three layers, strictly separated:

1. **`scripts/build-corpus.js`** — the ONLY place entries are authored. Emits
   `corpus/corpus.json` (machine) and `corpus/PLAIN.txt` (human) with
   deterministic output; `--check` verifies the committed artifacts match.
   CI fails on drift. Never edit corpus files by hand.
2. **`lib/`** — harness logic. `corpus.js` (load + `matchKind` classification:
   exact/normalization/case/compatibility), `check.js` (read-only walker +
   **pure `analyze(files)` seam** — twin-collision logic is tested through
   synthetic file lists because the fixtures cannot coexist on
   normalization-insensitive volumes), `seed.js` (sandbox materialization,
   safety validation, collision findings), `roundtrip.js` (seed → snapshot →
   run → classify), `report.js` (text/JSON formatting; invisible chars
   always escaped).
3. **`bin/badname.js`** — hand-rolled arg parsing (no deps), exit codes:
   0 clean, 1 hazards/mangling, 2 usage error.

## Invariants

- Zero runtime dependencies. Node ≥ 20, ESM.
- `check` never writes anything. `seed` only writes into empty/new dirs.
- Every entry needs a full-sentence `why` and correct `platforms` metadata
  (`[]` = expected to fail creation everywhere — error-handling tests).
- Invisible/control characters are escaped as `\uXXXX` in every human-readable
  output, including PLAIN.txt.
- EEXIST during seed on normalization/case-insensitive volumes is a **finding**
  (`collided`), not a failure — the filesystem demonstrating the bug class.
- `check` keeps false positives near zero: singleton entries always report;
  twin-group entries report only when another file in the same directory
  matches the same group (a lone `Makefile` is not a hazard). `--all` opts
  into reporting every corpus match.
- Adding an entry = one `add()` line in the builder + regenerate + commit both
  artifacts together.

## Fixture authoring notes

- Escape invisibles in source (`\u00A0`), keep visible non-ASCII raw.
- Twin pairs share a `group`; NFC form first.
- Windows-reserved / colon names: `{ platforms: ['darwin', 'linux'] }`.
- Known APFS quirks are welcome as data (e.g. `ﬁle.txt` U+FB01 collides with
  `file.txt` on APFS — verified live while building this corpus).

## CI

`.github/workflows/ci.yml` — ubuntu/macos/windows matrix, Node 20 + 24, runs
`npm run check` verbatim. The Windows leg is the point: per-platform
creatability divergences are the product, so failures there usually mean
wrong `platforms` metadata, not a flaky build.
