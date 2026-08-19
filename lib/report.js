// Output formatting for the CLI. Plain text by default, --json for machines.

import { displayPath } from './corpus.js'

export function formatCheckReport ({ hits, scanned }, json) {
  if (json) return JSON.stringify({ scanned, hitCount: hits.length, hits }, null, 2)
  if (hits.length === 0) {
    return `badname: clean — scanned ${scanned} entries, no corpus hazards found.`
  }
  const lines = []
  lines.push(`badname: ${hits.length} hazard(s) found among ${scanned} entries`)
  lines.push('')
  for (const hit of hits) {
    lines.push(`  ${displayPath(hit.relPath)}`)
    for (const e of hit.entries) {
      lines.push(`    -> ${e.id} [${e.category}] (${e.kind}) — ${e.why}`)
    }
  }
  lines.push('')
  lines.push('Corpus: https://github.com/sainzs/badname — fixture docs in corpus/corpus.json')
  return lines.join('\n')
}

export function formatSeedReport (report, json) {
  if (json) return JSON.stringify(report, null, 2)
  const lines = []
  lines.push(`seeded ${report.created.length} fixtures into ${report.dir}`)
  if (report.collided.length > 0) {
    lines.push(`collided ${report.collided.length} (filesystem considers these equal to an earlier name — normalization- or case-insensitive volume; this is a finding, not an error):`)
    for (const c of report.collided) lines.push(`  ${c.id}`)
  }
  if (report.skipped.length > 0) {
    const reasons = {}
    for (const s of report.skipped) reasons[s.reason] = (reasons[s.reason] ?? 0) + 1
    lines.push(`skipped ${report.skipped.length}: ` + Object.entries(reasons).map(([k, v]) => `${v} ${k}`).join(', '))
  }
  if (report.failed.length > 0) {
    lines.push(`failed ${report.failed.length}:`)
    for (const f of report.failed) lines.push(`  ${f.id}: ${f.error}`)
  }
  return lines.join('\n')
}

export function formatRoundtripReport (report, json) {
  if (json) return JSON.stringify(report, null, 2)
  const lines = []
  lines.push(`roundtrip: ran ${JSON.stringify(report.command)} in ${report.dir}`)
  lines.push(`seeded ${report.seeded.length}, skipped ${report.skippedCount}, survived ${report.survived.length}`)
  if (report.results.length === 0) {
    lines.push('result: CLEAN — every fixture name survived byte-identical.')
  } else {
    lines.push(`result: MANGLED — ${report.results.length} change(s):`)
    for (const r of report.results) {
      lines.push(`  [${r.kind}] ${r.before === null ? '(new)' : displayPath(r.before)} -> ${r.after === null ? '(gone)' : displayPath(r.after)}`)
    }
  }
  return lines.join('\n')
}
