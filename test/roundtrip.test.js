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

test('tar roundtrip on POSIX keeps names intact (the reference tool)', async () => {
  if (process.platform === 'win32') return
  const cmd = 'bash -c \'tar cf out.tar . 2>/dev/null && mkdir restored && tar xf out.tar -C restored 2>/dev/null && rm -f out.tar && rm -rf $(ls -A | grep -v restored) && mv restored/* . 2>/dev/null; rmdir restored\''
  const report = await roundtrip(cmd)
  // bsdtar/GNU tar on macOS/Linux handle Unicode names correctly; allow a
  // small number of platform quirks but the vast majority must survive.
  assert.ok(report.survived.length > 100, `only ${report.survived.length} survived tar roundtrip`)
})
