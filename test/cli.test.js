import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BIN = join(ROOT, 'bin', 'pathological.js')

function run (args, opts = {}) {
  return spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8', ...opts })
}

test('version prints the corpus version', () => {
  const p = run(['version'])
  assert.equal(p.status, 0)
  assert.match(p.stdout.trim(), /^\d+\.\d+\.\d+$/)
})

test('help exits 0 and documents every command', () => {
  const p = run([])
  assert.equal(p.status, 0)
  for (const word of ['check', 'seed', 'roundtrip', 'list']) {
    assert.ok(p.stdout.includes(word), `help mentions ${word}`)
  }
})

test('unknown command exits 2', () => {
  const p = run(['frobnicate'])
  assert.equal(p.status, 2)
})

test('check exits 0 on a clean tree and 1 on hazards', async () => {
  const clean = await mkdtemp(join(tmpdir(), 'pathological-cli-'))
  assert.equal(run(['check', clean]).status, 0)

  const dirty = await mkdtemp(join(tmpdir(), 'pathological-cli-'))
  await writeFile(join(dirty, 'CON'), 'x')
  const p = run(['check', dirty])
  assert.equal(p.status, 1)
  assert.ok(p.stdout.includes('hazard'), 'report mentions hazards')
  assert.ok(p.stdout.includes('windows-reserved'), 'report cites the entry')
})

test('check --json emits machine-readable output', async () => {
  const dirty = await mkdtemp(join(tmpdir(), 'pathological-cli-'))
  await writeFile(join(dirty, 'CON'), 'x')
  const p = run(['check', dirty, '--json'])
  assert.equal(p.status, 1)
  const parsed = JSON.parse(p.stdout)
  assert.ok(Array.isArray(parsed.hits) && parsed.hits.length === 1)
  assert.equal(parsed.hits[0].entries[0].id, 'windows-reserved-01')
})

test('seed writes into a fresh directory and exits 0', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'pathological-cli-seed-'))
  const inner = join(dir, 'sandbox')
  const p = run(['seed', inner])
  assert.equal(p.status, 0)
  assert.ok(p.stdout.includes('seeded'))
})

test('list --category prints only that category', () => {
  const p = run(['list', '--category', 'ntfs-streams'])
  assert.equal(p.status, 0)
  const lines = p.stdout.trim().split('\n')
  assert.equal(lines.length, 4)
  assert.ok(lines.every(l => l.includes('ntfs-streams-')))
})

test('roundtrip requires a command after --', () => {
  const p = run(['roundtrip'])
  assert.equal(p.status, 2)
})
