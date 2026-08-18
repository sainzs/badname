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

## Answers (verified ≤500 characters)

### Why does this repository qualify? — 483 chars

> memex is the first shared corpus of file paths that silently break
> tools — Unicode NFC/NFD twins, Windows-reserved names, bidi overrides,
> control characters. Born from my upstream fixes for exactly this bug class
> (Kilo Code #7835 merged; OpenCode #32216, NFD patch-matching), it ships
> 150 curated fixtures across 19 categories plus a CI harness
> (check/seed/roundtrip). Every archiver, sync engine, and AI coding agent
> hits these bugs; until now no shared test corpus existed.

### How will you use API credits for your project? — 429 chars

> Credits run the corpus flywheel: Codex mines real bug-fix commits in
> popular repos to propose new fixtures, reviews fixture PRs (every entry
> requires provenance), generates per-platform behavior matrices from the
> macOS/Linux/Windows CI runs, and hardens the harness itself. Credits also
> power Codex PR review and release automation across my other maintained
> repos: santiagosainz-skills, random-access-themes, reckoner, registro.

### Anything else we should know? — 405 chars

> I'm an active upstream contributor: two merged PRs in Kilo Code (~20k★),
> including a Windows path-normalization fix, plus open Unicode/NFD fixes in
> OpenCode (#32216, #32208) — the exact bug class this corpus encodes.
> Maintainer portfolio: santiagosainz-skills, random-access-themes, reckoner,
> registro (all MIT, CI-validated, released). Goal: make filename safety a
> one-line CI check for every repository.

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
      `npm publish` — ships as `@sainzs/memex`; unscoped name taken)
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
- Live demo of the thesis: `npx @sainzs/memex roundtrip -- 'tar cf o.tar . && mkdir r && tar xf o.tar -C r && rm o.tar'`

## Local verification (passes today)

- `npm run check`: corpus in sync · 36/36 tests · self-scan clean.
- 3-OS CI matrix committed (`ci.yml`) — will execute once billing is fixed.
