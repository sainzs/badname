import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { analyze, check } from '../lib/check.js'

async function freshDir () {
  return mkdtemp(join(tmpdir(), 'pathological-test-'))
}

// --- pure analysis (works identically on every volume) ----------------------

const f = (relPath, dir = '') => ({ relPath, name: relPath.split('/').pop(), dir })

test('analyze: clean tree stays clean', () => {
  const { hits, scanned } = analyze([f('normal.txt'), f('src/index.js', 'src')])
  assert.equal(hits.length, 0)
  assert.equal(scanned, 2)
})

test('analyze: singleton hazards always report (reserved, invisible)', () => {
  const { hits } = analyze([f('CON'), f('nb\u00A0sp.txt')])
  assert.equal(hits.length, 2)
  const cats = hits.flatMap(h => h.entries.map(e => e.category)).sort()
  assert.deepEqual(cats, ['whitespace-lookalikes', 'windows-reserved'])
})

test('analyze: lone NFC name from a twin pair is NOT a finding', () => {
  const { hits } = analyze([f('café.txt')])
  assert.equal(hits.length, 0)
})

test('analyze: lone Makefile is NOT a finding', () => {
  const { hits } = analyze([f('Makefile')])
  assert.equal(hits.length, 0)
})

test('analyze: NFC + NFD twins in the same directory ARE a finding', () => {
  const { hits } = analyze([f('café.txt'), f('cafe\u0301.txt')])
  assert.equal(hits.length, 2)
  const kinds = new Set(hits.flatMap(h => h.entries.map(e => e.kind)))
  assert.ok(kinds.has('exact'))
  assert.ok(kinds.has('normalization'))
})

test('analyze: case twins in the same directory ARE a finding', () => {
  const { hits } = analyze([f('README.txt'), f('readme.txt')])
  assert.equal(hits.length, 2)
  assert.ok(hits.every(h => h.entries.some(e => e.category === 'case-collisions')))
})

test('analyze: ligature and ASCII twin in the same directory ARE a finding', () => {
  const { hits } = analyze([f('\uFB01le.txt'), f('file.txt')])
  assert.equal(hits.length, 2)
  assert.ok(hits.every(h => h.entries.some(e => e.category === 'unicode-normalization')))
})

test('analyze: twins in different directories are not a collision', () => {
  const { hits } = analyze([f('a/README.txt', 'a'), f('b/readme.txt', 'b')])
  assert.equal(hits.length, 0)
})

test('analyze: --all reports lone twins too', () => {
  const { hits } = analyze([f('Makefile')], { all: true })
  assert.equal(hits.length, 1)
  assert.equal(hits[0].entries[0].category, 'case-collisions')
})

// --- filesystem-level behavior ----------------------------------------------

test('check walks a real tree and reports relative paths', async () => {
  const dir = await freshDir()
  await mkdir(join(dir, 'docs'))
  await writeFile(join(dir, 'docs', 'CON'), 'hi')
  await writeFile(join(dir, 'normal.txt'), 'hi')
  const { hits, scanned } = await check(dir)
  assert.equal(hits.length, 1)
  assert.equal(hits[0].relPath, 'docs/CON')
  assert.equal(scanned, 3)
})

test('check skips .git and node_modules', async () => {
  const dir = await freshDir()
  await mkdir(join(dir, '.git'))
  await mkdir(join(dir, 'node_modules'))
  await writeFile(join(dir, '.git', 'CON'), 'hi')
  await writeFile(join(dir, 'node_modules', 'CON'), 'hi')
  const { hits } = await check(dir)
  assert.equal(hits.length, 0)
})

test('check detects real singletons on disk', async () => {
  const dir = await freshDir()
  await writeFile(join(dir, 'nb\u00A0sp.txt'), 'hi')
  const { hits } = await check(dir)
  assert.equal(hits.length, 1)
  assert.equal(hits[0].entries[0].category, 'whitespace-lookalikes')
})

// On normalization/case-INSENSITIVE volumes (macOS APFS, default Windows),
// twin fixtures collapse to one file at creation — the collision is then a
// seed-time EEXIST finding, not a scan-time one. The scan-level twin tests
// above run identically everywhere via analyze(); this test documents the
// volume behavior instead.
test('filesystem twin reality: both twins coexist only on sensitive volumes', async () => {
  const dir = await freshDir()
  await writeFile(join(dir, 'README.txt'), 'hi')
  await writeFile(join(dir, 'readme.txt'), 'hi')
  const { readdir } = await import('node:fs/promises')
  const listing = await readdir(dir)
  if (listing.length === 2) {
    const { hits } = await check(dir)
    assert.equal(hits.length, 2) // case-sensitive volume (Linux CI)
  } else {
    assert.equal(listing.length, 1) // insensitive volume collapsed the pair
  }
})
