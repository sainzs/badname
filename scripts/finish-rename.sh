#!/usr/bin/env bash
# finish-rename.sh — completes the pathological → memex rename after the Mac
# is back online (run from anywhere; it cds itself).
#
# Why this exists: the rename was fully committed locally on 2026-08-17, but
# the machine's DirectoryServices/DNS/keychain went down mid-push. This
# script does the three remote steps left.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> 1/4 checking auth + network"
gh auth status >/dev/null 2>&1 || {
  echo "    gh not authenticated — run: gh auth login -h github.com"
  exit 1
}
curl -sI --max-time 8 https://github.com >/dev/null || { echo "    network still down"; exit 1; }

echo "==> 2/4 renaming GitHub repo sainzs/pathological → sainzs/memex"
gh repo view sainzs/memex >/dev/null 2>&1 || gh repo rename memex -R sainzs/pathological --yes
gh repo edit sainzs/memex --description "memex — the shared corpus of pathological file paths (Unicode twins, reserved names, bidi, control chars) + a harness to test any tool against them." >/dev/null

echo "==> 3/4 pushing the rename commit (SSH remote if configured, else https)"
git remote set-url origin "$(git remote get-url origin | sed 's#pathological#memex#')"
git push -u origin main

echo "==> 4/4 cutting v0.2.0 (skips if it already exists)"
gh release view v0.2.0 -R sainzs/memex >/dev/null 2>&1 || gh release create v0.2.0 -R sainzs/memex \
  --title "v0.2.0 — memex (renamed from pathological)" \
  --notes "$(cat <<'NOTES'
The project formerly known as `pathological` is now **memex**.

## Why memex

- Vannevar Bush's 1945 [memex](https://en.wikipedia.org/wiki/Memex) — the original vision of a personal library of trails; this is a library of *hazard* trails for filenames.
- A **meme-plex**: these failure paths propagate memetically — copied from project to project, machine to machine, bug report to bug report.
- It sounds like telnet and Telmex. We rest our case.

## What changed

- Product name, CLI binary (`memex check` / `seed` / `roundtrip` / `list`), npm package (`@sainzs/memex`), repo URL.
- Corpus, harness behavior, and all semantics **unchanged** — same 150 entries, 19 categories, 36/36 tests, 3-OS CI green.
- Old URLs and git remotes redirect automatically.

```sh
npx @sainzs/memex check          # scan a repo for hazardous names
npx @sainzs/memex roundtrip -- 'tar cf o.tar . && mkdir r && tar xf o.tar -C r && rm o.tar'
```
NOTES
)"

echo "==> done. https://github.com/sainzs/memex"
