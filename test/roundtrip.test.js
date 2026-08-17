import test from 'node:test'
import assert from 'node:assert/strict'
import { roundtrip, mangled } from '../lib/roundtrip.js'

test('a no-op command survives cleanly', async () => {
  const report = await roundtrip('node -e "0"')
  assert.equal(report.results.length, 0)
  assert.ok(report.survived.length > 100, `only ${report.survived.length} survived`)
  assert.equal(mangled(report), false)
})

test('a normalizing mangler is detected as renames', async () => {
  const mangler = 'node -e "const fs=require(\'fs\');for(const f of fs.readdirSync(\'.\')){const n=f.normalize(\'NFC\');if(n!==f){fs.renameSync(f,n)}}"'
  const report = await roundtrip(mangler)
  assert.equal(mangled(report), true)
  const kinds = new Set(report.results.map(r => r.kind))
  assert.ok(kinds.has('normalized'), `expected normalized renames, got ${[...kinds]}`)
  // Every detected change must map before -> after that differ only by normalization.
  for (const r of report.results) {
    if (r.kind === 'normalized') {
      assert.equal(r.before.normalize('NFC'), r.after.normalize('NFC'))
      assert.notEqual(r.before, r.after)
    }
  }
})

test('a deleting mangler is detected as missing', async () => {
  const mangler = 'node -e "const fs=require(\'fs\');for(const f of fs.readdirSync(\'.\')){if(f.startsWith(\'ca\'))fs.unlinkSync(f)}"'
  const report = await roundtrip(mangler)
  assert.equal(mangled(report), true)
  assert.ok(report.results.some(r => r.kind === 'missing'))
})

test('tar preserves fixture names (byte-exact on Linux; NFC-tolerant on macOS bsdtar)', async () => {
  if (process.platform === 'win32') return
  const { mkdtemp, readdir } = await import('node:fs/promises')
  const { spawnSync } = await import('node:child_process')
  const { seed } = await import('../lib/seed.js')

  const dir = await mkdtemp(join(tmpdir(), 'pathological-tar-'))
  await seed(dir)

  const topNames = async () =>
    (await readdir(dir)).filter(n => n !== 'out.tar' && n !== 'restored')

  const before = await topNames()
  const proc = spawnSync('bash', ['-c', 'tar cf out.tar . && mkdir restored && tar xf out.tar -C restored'], { cwd: dir, encoding: 'utf8' })
  assert.equal(proc.status, 0, `tar failed: ${proc.stderr}`)

  const after = (await readdir(join(dir, 'restored'))).filter(n => n !== 'out.tar' && n !== 'restored')
  const afterSet = new Set(after)

  const missing = []
  const normalized = []
  for (const name of before) {
    if (afterSet.has(name)) continue
    if (after.some(n => n.normalize('NFC') === name.normalize('NFC'))) {
      normalized.push(name)
      continue
    }
    missing.push(name)
  }

  // Names must never be LOST on any platform.
  assert.deepEqual(missing, [], `tar lost names: ${JSON.stringify(missing)}`)

  // On Linux, tar must also preserve bytes exactly.
  // On macOS, bsdtar (libarchive) writes pax headers in NFC, so NFD names
  // legitimately come back normalized — a real finding this corpus exists
  // to document, tolerated and surfaced here.
  if (process.platform === 'darwin') {
    if (normalized.length > 0) {
      console.log(`note: macOS bsdtar normalized ${normalized.length} name(s) through the tar roundtrip (expected finding)`)
    }
  } else {
    assert.deepEqual(normalized, [], `tar normalized names on ${process.platform}: ${JSON.stringify(normalized)}`)
  }

  assert.ok(before.length > 100, `only ${before.length} fixtures at top level`)
})
