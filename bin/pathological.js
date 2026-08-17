#!/usr/bin/env node
// pathological — the shared corpus of pathological file paths.
//
//   pathological check [dir]        scan a tree for corpus hazards (read-only)
//   pathological seed [dir]         materialize fixtures into an empty sandbox
//   pathological roundtrip -- <cmd> run a shell command in a seeded sandbox
//   pathological list               print corpus entries
//
// Run `pathological help <command>` for details.

import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { check } from '../lib/check.js'
import { loadCorpus, displayPath } from '../lib/corpus.js'
import { seed, resolveSandbox } from '../lib/seed.js'
import { roundtrip, mangled } from '../lib/roundtrip.js'
import { formatCheckReport, formatSeedReport, formatRoundtripReport } from '../lib/report.js'

const HELP = {
  default: `pathological — the shared corpus of pathological file paths

Usage:
  pathological check [dir] [--skip name,...] [--json]
  pathological seed [dir] [--category <id>] [--json]
  pathological roundtrip -- <shell command> [--json]
  pathological list [--category <id>] [--json]
  pathological help [command]
  pathological version

check      Read-only scan: reports files/dirs whose names are corpus members
           or Unicode twins of corpus members. Singleton hazards (CON, glob
           names, invisible-character names) always report; twin pairs
           (NFC/NFD, case, ligature) report only when both twins exist in the
           same directory. --all reports every match. Exits 1 on any hit.
seed       Writes the fixture tree into an empty (or new) directory. Entries
           not creatable on this OS are skipped and reported. Default target
           is a fresh temp directory.
roundtrip  Seeds a temp sandbox, runs your shell command inside it, then
           reports every fixture name that was renamed, normalized, or lost.
           Exits 1 on mangling. Example:
             pathological roundtrip -- bash -c 'tar cf out.tar . && mkdir x && tar xf out.tar -C x && rm -rf out.tar'
list       Print corpus entries (visible form; invisible chars escaped).

Docs: https://github.com/sainzs/pathological`,
}

function usage (code = 0) {
  console.log(HELP.default)
  process.exit(code)
}

function parseFlags (args, flags) {
  const opts = { _: [] }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    const hit = flags[a]
    if (hit) {
      if (hit === true) opts[a] = true
      else opts[a] = args[++i]
    } else {
      opts._.push(a)
    }
  }
  return opts
}

async function main () {
  const [cmd, ...rest] = process.argv.slice(2)

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    usage()
  }
  if (cmd === 'version' || cmd === '--version' || cmd === '-v') {
    console.log(loadCorpus().version)
    return
  }

  if (cmd === 'check') {
    const opts = parseFlags(rest, { '--json': true, '--skip': 'skip', '--all': true })
    const dir = opts._[0] ?? '.'
    const result = await check(dir, {
      skip: opts['--skip'] ? opts['--skip'].split(',') : [],
      all: Boolean(opts['--all']),
    })
    console.log(formatCheckReport(result, Boolean(opts['--json'])))
    process.exit(result.hits.length > 0 ? 1 : 0)
  }

  if (cmd === 'seed') {
    const opts = parseFlags(rest, { '--json': true, '--category': 'category', '--force': true })
    const dirArg = opts._[0] ?? join(tmpdir(), 'pathological-sandbox')
    const dir = resolveSandbox(dirArg)
    const report = await seed(dir, { category: opts['--category'] })
    console.log(formatSeedReport(report, Boolean(opts['--json'])))
    process.exit(report.failed.length > 0 && report.created.length === 0 ? 1 : 0)
  }

  if (cmd === 'roundtrip') {
    const dd = rest.indexOf('--')
    if (dd === -1 || rest.length <= dd + 1) {
      console.error('usage: pathological roundtrip -- <shell command>')
      process.exit(2)
    }
    const command = rest.slice(dd + 1).join(' ')
    const flags = rest.slice(0, dd)
    const opts = parseFlags(flags, { '--json': true })
    const report = await roundtrip(command)
    console.log(formatRoundtripReport(report, Boolean(opts['--json'])))
    process.exit(mangled(report) ? 1 : 0)
  }

  if (cmd === 'list') {
    const opts = parseFlags(rest, { '--json': true, '--category': 'category' })
    const corpus = loadCorpus()
    const entries = opts['--category']
      ? corpus.entries.filter(e => e.category === opts['--category'])
      : corpus.entries
    if (opts['--json']) {
      console.log(JSON.stringify(entries, null, 2))
    } else {
      for (const e of entries) {
        console.log(`${displayPath(e.path)}\t${e.id}${e.group ? `\tgroup=${e.group}` : ''}`)
      }
    }
    return
  }

  console.error(`unknown command: ${cmd}`)
  usage(2)
}

main().catch(err => {
  console.error('pathological: ' + err.message)
  process.exit(1)
})
