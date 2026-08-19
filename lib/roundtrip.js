// `badname roundtrip` — run a shell command inside a freshly seeded
// sandbox and report which fixture names the command mangled.
//
// Detection: names that disappeared or whose bytes changed after the command
// ran, classified as missing / normalized / case-folded / other.

import { mkdtemp, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { creatableOn, loadCorpus } from './corpus.js'
import { seed } from './seed.js'

async function walkNames (dir, rel = '', out = []) {
  for (const dent of await readdir(dir, { withFileTypes: true })) {
    const relPath = rel ? rel + '/' + dent.name : dent.name
    out.push(relPath)
    if (dent.isDirectory()) await walkNames(join(dir, dent.name), relPath, out)
  }
  return out
}

function classify (before, after) {
  const afterSet = new Set(after)
  const results = []
  const newNames = new Set(after.filter(n => !before.includes(n)))

  for (const name of before) {
    if (afterSet.has(name)) continue
    // Same name modulo Unicode normalization?
    const norm = after.find(n => n !== name && n.normalize('NFC') === name.normalize('NFC'))
    if (norm) {
      results.push({ before: name, after: norm, kind: 'normalized' })
      newNames.delete(norm)
      continue
    }
    const folded = after.find(n => n !== name && n.toLowerCase() === name.toLowerCase())
    if (folded) {
      results.push({ before: name, after: folded, kind: 'case-folded' })
      newNames.delete(folded)
      continue
    }
    results.push({ before: name, after: null, kind: 'missing' })
  }
  for (const n of newNames) {
    results.push({ before: null, after: n, kind: 'appeared' })
  }
  return results
}

/**
 * Run `command` (a shell string) with cwd = freshly seeded sandbox.
 * Returns { dir, command, seeded: [ids], skippedCount, survived, results, exit }.
 */
export async function roundtrip (command, opts = {}) {
  const corpus = loadCorpus()
  const dir = await mkdtemp(join(tmpdir(), 'pathological-rt-'))
  const seeded = await seed(dir, opts)
  if (seeded.created.length === 0) throw new Error('no fixtures were seeded')

  const eligible = corpus.entries.filter(e =>
    seeded.created.includes(e.id) && !e.path.includes('/'))

  const before = await walkNames(dir)
  const filteredBefore = before.filter(n => !n.startsWith('pathological-rt-'))

  const proc = spawnSync(command, {
    shell: true,
    cwd: dir,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  })

  const after = await walkNames(dir)
  const results = classify(filteredBefore, after)

  const changed = new Set(results.map(r => r.before ?? r.after))
  const survived = eligible.filter(e => !changed.has(e.path)).map(e => e.id)

  return {
    dir,
    command,
    seeded: seeded.created,
    skippedCount: seeded.skipped.length + seeded.failed.length,
    survived,
    results,
    exit: proc.status,
  }
}

/** True when roundtrip results show mangling (missing/renamed/appeared). */
export function mangled (report) {
  return report.results.length > 0
}
