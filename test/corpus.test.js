import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadCorpus, matchKind, displayPath } from '../lib/corpus.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const VALID_PLATFORMS = new Set(['darwin', 'linux', 'win32'])

test('corpus has a healthy number of entries across all categories', () => {
  const corpus = loadCorpus()
  assert.ok(corpus.entries.length >= 140, `expected >=140 entries, got ${corpus.entries.length}`)
  assert.ok(corpus.categories.length >= 15)
  assert.equal(corpus.entryCount, corpus.entries.length)
})

test('every entry is well-formed', () => {
  const corpus = loadCorpus()
  const cats = new Set(corpus.categories.map(c => c.id))
  const ids = new Set()
  for (const e of corpus.entries) {
    assert.ok(e.id, 'entry has id')
    assert.ok(!ids.has(e.id), `duplicate id: ${e.id}`)
    ids.add(e.id)
    assert.ok(cats.has(e.category), `unknown category: ${e.category}`)
    assert.ok(typeof e.path === 'string' && e.path.length > 0, `${e.id} has a path`)
    assert.ok(typeof e.why === 'string' && e.why.length > 20, `${e.id} has a why`)
    assert.ok(Array.isArray(e.platforms))
    for (const p of e.platforms) assert.ok(VALID_PLATFORMS.has(p), `${e.id} bad platform ${p}`)
  }
})

test('committed corpus files are in sync with the builder', () => {
  const proc = spawnSync(process.execPath, [join(ROOT, 'scripts', 'build-corpus.js'), '--check'], { encoding: 'utf8' })
  assert.equal(proc.status, 0, `corpus drift:\n${proc.stdout}${proc.stderr}`)
})

test('matchKind classifies the canonical cases', () => {
  assert.equal(matchKind('café.txt', 'café.txt'), 'exact')
  assert.equal(matchKind('cafe\u0301.txt', 'café.txt'), 'normalization')
  assert.equal(matchKind('README.TXT', 'readme.txt'), 'case')
  assert.equal(matchKind('\uFB01le.txt', 'file.txt'), 'compatibility')
  assert.equal(matchKind('unrelated.txt', 'café.txt'), null)
})

test('displayPath escapes invisible characters', () => {
  assert.equal(displayPath('a\u0301b'), 'a\u0301b') // combining marks stay visible-raw
  assert.equal(displayPath('x\u000Ay'), 'x\\u000Ay')
  assert.equal(displayPath('x\u200By'), 'x\\u200By')
  assert.equal(displayPath('\u{1F600}'), '\u{1F600}')
})
