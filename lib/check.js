// `badname check` — scan a repo tree for corpus-member hazards.
// Strictly read-only.
//
// Reporting rules (low false positives by design):
//  1. Singleton corpus entries (no `group`) always report on any match —
//     a name like `CON`, `*`, or one containing an NBSP is hazardous alone.
//  2. Twin-group entries (NFC/NFD pairs, case pairs, ligature twins) only
//     report when at least one OTHER file in the same directory also matches
//     the same group — the actual collision. A lone `Makefile` or a lone
//     NFC `café.txt` is not a finding.
//  3. `--all` reports every corpus match, including lone twins.

import { opendir } from 'node:fs/promises'
import { join } from 'node:path'
import { isTreeEntry, loadCorpus, matchKind } from './corpus.js'

const DEFAULT_SKIP = new Set(['.git', 'node_modules', '.hg', '.svn'])

async function walk (dir, skip, rel = '', out = []) {
  let dh
  try {
    dh = await opendir(dir)
  } catch {
    return out
  }
  for await (const dent of dh) {
    if (skip.has(dent.name)) continue
    const relPath = rel ? rel + '/' + dent.name : dent.name
    out.push({ relPath, name: dent.name, isDir: dent.isDirectory(), dir: rel })
    if (dent.isDirectory()) {
      await walk(join(dir, dent.name), skip, relPath, out)
    }
  }
  return out
}

function matchesFor (name, corpus) {
  const out = []
  for (const entry of corpus.entries) {
    if (isTreeEntry(entry)) continue
    const kind = matchKind(name, entry.path)
    if (kind) out.push({ ...entry, kind })
  }
  return out
}

/**
 * Pure collision analysis over a file list (no filesystem).
 * `files`: [{relPath, name, dir}] — dir is the parent relative path ('' at root).
 * This is the seam that makes twin-collision logic testable on
 * normalization-insensitive volumes (macOS/Windows), where the fixtures
 * themselves cannot coexist on disk.
 */
export function analyze (files, opts = {}) {
  const all = Boolean(opts.all)
  const corpus = loadCorpus()

  const fileMatches = new Map()
  for (const file of files) {
    const m = matchesFor(file.name, corpus)
    if (m.length > 0) fileMatches.set(file, m)
  }

  // dir -> group -> Set of distinct files matching that group.
  const groupFiles = new Map()
  for (const [file, matches] of fileMatches) {
    for (const m of matches) {
      if (!m.group) continue
      const key = file.dir + '\u0000' + m.group
      const set = groupFiles.get(key) ?? new Set()
      set.add(file.relPath)
      groupFiles.set(key, set)
    }
  }

  const hits = []
  for (const [file, matches] of fileMatches) {
    const kept = []
    const seen = new Set()
    for (const m of matches) {
      const key = m.id + ':' + m.kind
      if (seen.has(key)) continue
      seen.add(key)
      if (!m.group || all) {
        kept.push(m)
        continue
      }
      const set = groupFiles.get(file.dir + '\u0000' + m.group)
      if (set && set.size >= 2) kept.push(m) // real twin collision in this dir
    }
    if (kept.length > 0) hits.push({ relPath: file.relPath, name: file.name, entries: kept })
  }
  return { hits, scanned: files.length }
}

/**
 * Scan `dir` for names that are members of (or fuzzy twins of) corpus entries.
 * Returns { hits: [{relPath, name, entries: [...]}], scanned }
 */
export async function check (dir, opts = {}) {
  const skip = new Set([...DEFAULT_SKIP, ...(opts.skip ?? [])])
  const files = await walk(dir, skip)
  return analyze(files, opts)
}

