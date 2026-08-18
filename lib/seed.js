// `memex seed` — materialize corpus fixtures into a sandbox directory.
//
// Safety rules:
//  - The target must be empty or nonexistent (refuse otherwise).
//  - Entry paths are validated: no absolute paths, no '..' components.
//  - Nothing is ever written outside the target directory.

import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { isAbsolute, join, resolve, sep } from 'node:path'
import { creatableOn, entryParts, loadCorpus } from './corpus.js'

function validateEntryPath (entry) {
  if (isAbsolute(entry.path)) return `entry ${entry.id} has an absolute path`
  const parts = entryParts(entry)
  if (parts.some(p => p === '..' || p === '.')) return `entry ${entry.id} contains '.' or '..' components`
  return null
}

/**
 * Seed fixtures into `dir`.
 * Returns { dir, created: [ids], skipped: [{id, reason}], failed: [{id, error}] }.
 */
export async function seed (dir, opts = {}) {
  const corpus = loadCorpus()
  const target = resolve(dir)

  const existing = await readdir(target).catch(() => null)
  if (existing !== null && existing.length > 0) {
    throw new Error(`refusing to seed into non-empty directory: ${target}`)
  }
  await mkdir(target, { recursive: true })

  const created = []
  const collided = []
  const skipped = []
  const failed = []

  for (const entry of corpus.entries) {
    if (opts.category && entry.category !== opts.category) continue
    if (entry.platforms.length === 0) {
      skipped.push({ id: entry.id, reason: 'expected-failure-everywhere' })
      continue
    }
    if (!creatableOn(entry)) {
      skipped.push({ id: entry.id, reason: `not-creatable-on-${process.platform}` })
      continue
    }
    const invalid = validateEntryPath(entry)
    if (invalid) {
      failed.push({ id: entry.id, error: invalid })
      continue
    }
    const parts = entryParts(entry)
    try {
      if (parts.length > 1) {
        await mkdir(join(target, ...parts.slice(0, -1)), { recursive: true })
      }
      await writeFile(join(target, ...parts), entry.id + '\n', { flag: 'wx' })
      created.push(entry.id)
    } catch (err) {
      if (err.code === 'EEXIST') {
        // The filesystem itself considers this name equal to one already
        // seeded (normalization- or case-insensitive volume). That is a
        // finding, not a failure: record it as a collision.
        collided.push({ id: entry.id, reason: 'name-equal-on-this-filesystem' })
      } else {
        failed.push({ id: entry.id, error: String(err.message).split('\n')[0] })
      }
    }
  }

  return { dir: target, created, collided, skipped, failed }
}

/** Resolve and sanity-check a sandbox path argument (used by CLI + tests). */
export function resolveSandbox (dir) {
  const target = resolve(dir)
  if (target === resolve('.') || target.split(sep).length <= 2) {
    // Allow anything that is not the cwd and not a filesystem root-ish path.
    if (target === resolve('.')) throw new Error('refusing to use the current directory as a sandbox')
  }
  return target
}
