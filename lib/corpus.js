// Corpus loading and matching primitives.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

let cached = null

export function loadCorpus () {
  if (cached) return cached
  cached = JSON.parse(readFileSync(join(ROOT, 'corpus', 'corpus.json'), 'utf8'))
  return cached
}

/** Escape invisible characters for display, same policy as PLAIN.txt. */
function escapeRanges (cp) {
  return (cp >= 0x00 && cp <= 0x1F) ||
    cp === 0x7F ||
    (cp >= 0x80 && cp <= 0x9F) ||
    cp === 0xAD ||
    (cp >= 0x2000 && cp <= 0x200F) ||
    (cp >= 0x2028 && cp <= 0x202F) ||
    (cp >= 0x2060 && cp <= 0x2064) ||
    (cp >= 0x2066 && cp <= 0x206F) ||
    cp === 0xFEFF ||
    (cp >= 0xFFF9 && cp <= 0xFFFB) ||
    cp === 0xE0001 ||
    (cp >= 0xE0020 && cp <= 0xE007F)
}

export function displayPath (s) {
  let out = ''
  for (const ch of s) {
    const cp = ch.codePointAt(0)
    if (escapeRanges(cp)) {
      if (cp > 0xFFFF) out += '\\u{' + cp.toString(16).toUpperCase() + '}'
      else out += '\\u' + cp.toString(16).toUpperCase().padStart(4, '0')
    } else {
      out += ch
    }
  }
  return out
}

/**
 * Classify how a candidate name relates to a corpus entry path.
 * Returns 'exact' | 'normalization' | 'case' | 'compatibility' | null.
 *  - exact: byte-identical
 *  - normalization: equal under NFC (e.g. NFD twin)
 *  - case: equal under toLowerCase
 *  - compatibility: equal under NFKC + case folding (ligatures, width, Kelvin)
 */
export function matchKind (candidate, entryPath) {
  if (candidate === entryPath) return 'exact'
  if (candidate.normalize('NFC') === entryPath.normalize('NFC')) return 'normalization'
  if (candidate.toLowerCase() === entryPath.toLowerCase()) return 'case'
  if (candidate.normalize('NFKC').toLowerCase() === entryPath.normalize('NFKC').toLowerCase()) return 'compatibility'
  return null
}

/** True for entries whose path is a tree (contains '/'). */
export function isTreeEntry (entry) {
  return entry.path.includes('/')
}

/** Entry components: ['a','a',...,'leaf.txt'] for tree entries, [name] otherwise. */
export function entryParts (entry) {
  return entry.path.split('/')
}

/** Host platform in corpus vocabulary (darwin | linux | win32). */
export function hostPlatform () {
  return process.platform
}

/** Can this entry be created on this platform per corpus metadata? */
export function creatableOn (entry, platform = hostPlatform()) {
  return entry.platforms.includes(platform)
}
