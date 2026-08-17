# Contributing to pathological

Thanks for helping harden the ecosystem's filename handling. The single rule:
**the best fixtures are paths that actually hurt you.** Ideal contributions
come with a story — the tool that broke, the platform, the error.

## Adding a fixture

1. Open [`scripts/build-corpus.js`](scripts/build-corpus.js) — it is the only
   place entries are authored. Find the right category block and add one line:

   ```js
   add('your\u00A0name.txt', 'whitespace-lookalikes',
       'What broke, on which platform, in one sentence.')
   ```

   - Write invisible characters as `\uXXXX` escapes (see existing entries).
   - Set `platforms` only when the name is not creatable everywhere:
     `{ platforms: ['darwin', 'linux'] }` for Windows-reserved/colon names,
     `[]` for names expected to fail creation on every filesystem.
   - Use `group` when an entry is one twin of a pair (`{ group: 'cafe' }`).
   - `why` must be a full sentence: what breaks and where. Link the bug if
     you have one.

2. Regenerate and verify:

   ```sh
   npm run corpus:build   # rewrites corpus/corpus.json + corpus/PLAIN.txt
   npm run check          # corpus in sync + tests + self-scan
   ```

3. Commit the builder change **and** both regenerated corpus files together.
   CI fails if they drift.

## Other contributions

- **New categories** — propose in an issue first, with two example entries.
- **Harness improvements** — `check`/`seed`/`roundtrip` semantics must stay
  backward compatible; anything that changes output gets a CHANGELOG entry.
- **Platform notes** — corrections to `platforms` metadata from people on
  unusual filesystems (ZFS case sensitivity variants, exFAT, WSL) are very
  welcome.

## Development

```sh
npm install       # nothing — zero runtime deps; only run to get the lockfile
npm test          # node:test suite
npm run check     # corpus:validate + tests + pathological check .
```

Zero runtime dependencies is a project invariant. Node ≥ 20.

## Conduct

By participating you agree to uphold the [Code of Conduct](CODE_OF_CONDUCT.md).
