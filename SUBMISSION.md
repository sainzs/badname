# Codex for Open Source — Submission Packet

Application vehicle: **[sainzs/memex](https://github.com/sainzs/memex)**
Form: <https://openai.com/form/codex-for-oss/> (rolling review; response by email)

## Form field map

| Field | Value |
| --- | --- |
| First name | Santiago |
| Last name | Sainz |
| Email | **[you] the email associated with your ChatGPT account** |
| GitHub username | `sainzs` (profile visibility must be public) |
| GitHub repository URL | `https://github.com/sainzs/memex` (public ✓) |
| Role | **Primary maintainer** |
| Why does this repository qualify? | see below (≤500 chars) |
| I'm interested in… | ☑ Codex Security ☑ API credits for my project |
| OpenAI Organization ID | **[you] from platform.openai.com → Settings → Organization** |
| How will you use API credits? | see below (≤500 chars) |
| Anything else we should know? | see below (≤500 chars) |

## Answers (proposal-shaped; verified ≤500 characters)

### Why does this repository qualify? — 427 chars

> memex is the first shared corpus of file paths that silently break tools —
> NFC/NFD twins, Windows-reserved names, bidi, control chars — with a CI
> harness (check/seed/roundtrip). It already found two verified macOS tar
> bugs (NFD-decomposing extraction; AppleDouble NAME_MAX overflow), and
> tools adopt it as a one-line CI dependency. Born from my merged upstream
> fixes for this exact bug class (Kilo Code #7835; OpenCode #32216).

### How will you use API credits for your project? — 392 chars

> A funded, measurable campaign: Codex runs memex fixtures against 30+
> archivers/sync/agent tools, reproduces each failure as a minimal repro,
> and files verified fix PRs upstream — corpus-derived regression tests ride
> in on the fixes. Public metric in six months: "N bugs filed, M fixes
> merged across K repos." Credits also power fixture-PR review and the
> per-platform conformance matrix in CI.

### Anything else we should know? — 430 chars

> Active upstream contributor: 2 merged Kilo Code PRs (26k★), incl. a
> Windows path-normalization fix; OpenCode NFD patch-matching fix (PR
> #32216) — the bug class this corpus encodes. Both macOS tar findings are
> being filed upstream (docs/bugs/) with memex as the reproducer. Portfolio
> of maintained, CI-green OSS: santiagosainz-skills, random-access-themes,
> reckoner, registro. Applying now, rolling; will reapply as adoption grows.

## Before you submit — human checklist

- [x] **GitHub billing fixed** (2026-08-17) — full 3-OS CI matrix green:
      ubuntu / macOS / Windows × Node 20/24 + tar roundtrips + self-check
      ([latest run](https://github.com/sainzs/memex/actions)).
- [x] **Releases**: [v0.1.0](https://github.com/sainzs/memex/releases/tag/v0.1.0) ·
      [v0.1.1](https://github.com/sainzs/memex/releases/tag/v0.1.1)
      (two verified macOS bsdtar findings recorded in the corpus — found by
      this project's own CI, which is the pitch).
- [ ] **GitHub profile visibility public** (form requirement).
- [ ] **Fill in** your ChatGPT email + OpenAI Organization ID above.
- [ ] **Optional but strengthening:** publish to npm (`npm login` then
      `npm publish` — ships as `@ssainzs/memex`; unscoped name taken)
      and swap this README badge line to the real npm badge; post once
      (Show HN "the Big List of Naughty Strings for file paths", r/node,
      OpenCode/Kilo communities) to seed organic stars before applying.
- [ ] Submit at the form URL, then **watch the inbox** used for ChatGPT.

## Evidence links (for follow-up email if asked)

- Repo: <https://github.com/sainzs/memex> · Release:
  [v0.1.0](https://github.com/sainzs/memex/releases/tag/v0.1.0)
- Provenance PRs (verified live 2026-08-17): Kilo Code
  [#7835](https://github.com/Kilo-Org/kilocode/pull/7835) and
  [#7832](https://github.com/Kilo-Org/kilocode/pull/7832) — **merged**;
  [#7834](https://github.com/Kilo-Org/kilocode/pull/7834) (same Windows-path
  bug class, closed unmerged). OpenCode
  [#32216](https://github.com/anomalyco/opencode/pull/32216) (NFC
  apply_patch) and [#32208](https://github.com/anomalyco/opencode/pull/32208)
  (EISDIR crash) — substantive, auto-closed by the repo's 2-hour
  contributing-guidelines bot on 2026-06-13, explicitly invited to reopen;
  revival is the top action in the core-maintainer track below.
- Live demo of the thesis: `node bin/memex.js roundtrip -- 'tar cf o.tar . && mkdir r && tar xf o.tar -C r && rm o.tar'` (clone first — not yet published to npm)

## Local verification (passes today)

- `npm run check`: corpus in sync · 36/36 tests · self-scan clean.
- 3-OS CI matrix committed (`ci.yml`) — will execute once billing is fixed.
