import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readdir, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadCorpus, creatableOn } from '../lib/corpus.js'
import { seed, resolveSandbox } from '../lib/seed.js'

test('seed materializes most of the corpus and reports the rest honestly', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'memex-seed-'))
  const report = await seed(dir)
  const corpus = loadCorpus()

  const attemptable = corpus.entries.filter(e => creatableOn(e)).length
  // Floor is 90, not 100+: Windows legitimately seeds fewer (POSIX-only
  // entries excluded, NTFS case-collisions recorded instead of created).
  assert.ok(report.created.length > 90, `created only ${report.created.length}`)
  assert.equal(
    report.created.length + report.collided.length + report.failed.length,
    attemptable,
    'created + collided + failed must equal attemptable entries'
  )
  assert.equal(report.created.length + report.collided.length + report.failed.length + report.skipped.length, corpus.entries.length)

  // Skipped entries must not exist on disk.
  const names = new Set(await readdir(dir))
  for (const s of report.skipped) {
    const entry = corpus.entries.find(e => e.id === s.id)
    assert.ok(!names.has(entry.path), `skipped entry ${s.id} should not be on disk`)
  }
})

test('seed creates deep trees with leaf files', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'memex-seed-'))
  await seed(dir)
  const s = await stat(join(dir, ...Array(10).fill('a'), 'leaf.txt')).catch(() => null)
  assert.ok(s && s.isFile(), '10-level tree leaf exists')
})

test('seed refuses non-empty directories', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'memex-seed-'))
  await seed(dir)
  await assert.rejects(() => seed(dir), /non-empty/)
})

test('seed with --category only seeds that category', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'memex-seed-'))
  const report = await seed(dir, { category: 'ntfs-streams' })
  const corpus = loadCorpus()
  const expected = corpus.entries.filter(e => e.category === 'ntfs-streams' && creatableOn(e)).length
  assert.equal(report.created.length + report.collided.length, expected)
})

test('resolveSandbox refuses the current directory', () => {
  assert.throws(() => resolveSandbox('.'), /current directory/)
})

test('filesystem collision findings on case-insensitive volumes are surfaced, not hidden', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'memex-seed-'))
  const report = await seed(dir)
  if (process.platform === 'darwin') {
    // APFS: normalization- and case-insensitive — we expect both kinds.
    const collidedIds = report.collided.map(c => c.id)
    assert.ok(collidedIds.some(id => id.startsWith('unicode-normalization-')), 'NFD twin collides on APFS')
    assert.ok(collidedIds.some(id => id.startsWith('case-collisions-')), 'case twin collides on APFS')
  } else {
    assert.ok(Array.isArray(report.collided))
  }
})
