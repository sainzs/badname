#!/usr/bin/env node
// memex — corpus builder.
//
// Single source of truth for the corpus. Running this script regenerates
// corpus/corpus.json and corpus/PLAIN.txt deterministically. Both files are
// committed; `npm run corpus:validate` (this script with --check) fails CI if
// the committed files drift from the builder.
//
// Escaping policy: invisible / control / format characters (see ESCAPE_RANGES
// below) are written as \uXXXX escapes in BOTH outputs so the corpus stays
// reviewable in any editor and safe to cat. Visible non-ASCII stays raw UTF-8.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CORPUS_DIR = join(ROOT, 'corpus')
const VERSION = '0.1.1'

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { id: 'unicode-normalization', description: 'NFC/NFD/NFKC twins of the same visible name. Break diff, patch, and sync tools that compare names byte-wise.' },
  { id: 'combining-marks', description: 'Base characters followed by combining marks. Invisible to reviewers, fatal to exact-match logic.' },
  { id: 'emoji-zwj', description: 'Emoji joined by zero-width joiners, modifiers, and regional-indicator pairs. Multi-codepoint graphemes that truncate badly.' },
  { id: 'bidi-rtl', description: 'Right-to-left text and bidi control characters. Renders one way, sorts and compares another.' },
  { id: 'control-chars', description: 'Control characters embedded in names. Corrupt terminals, logs, and anything that renders paths.' },
  { id: 'bom-invisibles', description: 'Byte-order marks and invisible formatting characters. Two names look identical, differ in bytes.' },
  { id: 'windows-reserved', description: 'DOS device names (CON, NUL, COM1…). Uncreatable or bizarre on Windows; fine on POSIX. Class of Kilo Code PR #7834.' },
  { id: 'trailing-separators', description: 'Trailing dots and spaces. Windows strips them silently, so copy operations lose the roundtrip.' },
  { id: 'separator-lookalikes', description: 'Colons, backslashes, and Unicode solidus lookalikes. Separator characters that are legal name bytes on one OS and structure on another.' },
  { id: 'length-limits', description: 'Names at and over byte/UTF-16 limits. 255 bytes (ext4) vs 255 UTF-16 chars (APFS/NTFS) diverge on multibyte names.' },
  { id: 'case-collisions', description: 'Names that collide under case-insensitive or case-folding comparison but differ in bytes.' },
  { id: 'locale-casing', description: 'Turkish dotless i and dotted İ. Case mappings change under locale; toLowerCase is not an identity check.' },
  { id: 'width-twins', description: 'Fullwidth and halfwidth forms. Ａ is not A; tools that normalize width silently lie.' },
  { id: 'cli-glob-hazards', description: 'Names that inject into command lines and glob patterns. Breaks naive shell-outs and agent-issued commands.' },
  { id: 'whitespace-lookalikes', description: 'Non-breaking, thin, and ideographic spaces that look exactly like the space you typed.' },
  { id: 'deep-nesting', description: 'Deep directory trees that push total path length past classic 4096-byte limits.' },
  { id: 'legacy-mojibake', description: 'Names that are what a latin-1→UTF-8 double-encoding produces. Common in archives rescued from old systems.' },
  { id: 'ntfs-streams', description: 'Colon-suffixed names: alternate data streams on NTFS, ordinary filenames on POSIX.' },
  { id: 'dash-confusables', description: 'Hyphen lookalikes: soft hyphen, minus sign, em dash. Flag parsing and option matching gone wrong.' },
]

// ---------------------------------------------------------------------------
// Entry helpers
// ---------------------------------------------------------------------------

const entries = []
const counters = new Map()

function slugId (category) {
  const n = (counters.get(category) ?? 0) + 1
  counters.set(category, n)
  return `${category}-${String(n).padStart(2, '0')}`
}

/**
 * add('café.txt', 'unicode-normalization', 'NFC form…', { platforms, group })
 * platforms defaults to all three; use [] for entries expected to fail
 * creation everywhere (they exist to test tool error handling).
 */
function add (path, category, why, opts = {}) {
  const platforms = opts.platforms ?? ['darwin', 'linux', 'win32']
  entries.push({
    id: slugId(category),
    path,
    category,
    platforms,
    ...(opts.group ? { group: opts.group } : {}),
    why,
  })
}

// --- unicode-normalization: NFC/NFD pairs ----------------------------------
const NORM_PAIRS = [
  ['café.txt', 'cafe\u0301.txt', 'cafe'],
  ['naïve.md', 'nai\u0308ve.md', 'naive'],
  ['resumé.pdf', 'resume\u0301.pdf', 'resume'],
  ['jalapeño.txt', 'jalapen\u0303o.txt', 'jalapeno'],
  ['Grüße.txt', 'Gru\u0308be.txt', 'grusse'],
  ['ångström.txt', 'a\u0308ngstro\u0308m.txt', 'angstrom'],
]
for (const [nfc, nfd, group] of NORM_PAIRS) {
  add(nfc, 'unicode-normalization', `NFC (precomposed) twin of group "${group}"; visually identical to its NFD sibling.`, { group })
  add(nfd, 'unicode-normalization', `NFD (decomposed) twin of group "${group}"; macOS HFS+ stores this form — byte-equality with the NFC name fails. The OpenCode apply_patch bug class (PR #32216). Verified in CI: GitHub macos-latest bsdtar returns this name NFC-normalized after a tar roundtrip (libarchive NFC pax headers).`, { group })
}
// NFKC compatibility twins
add('\uFB01le.txt', 'unicode-normalization', 'fi ligature U+FB01; NFKC-folds to "file.txt" but differs in bytes. Verified: APFS treats it as equal to the ASCII name — creating both fails with EEXIST.', { group: 'ligature-fi' })
add('file.txt', 'unicode-normalization', 'Plain ASCII twin of the fi-ligature name; collides under NFKC normalization — and empirically on APFS volumes.', { group: 'ligature-fi' })
add('\u2169I.txt', 'unicode-normalization', 'Roman numeral IX (U+2169) + I; NFKC-folds to "XII".', { group: 'roman-xii' })
add('XII.txt', 'unicode-normalization', 'ASCII twin of the Roman-numeral name; collides under NFKC.', { group: 'roman-xii' })

// --- combining-marks --------------------------------------------------------
add('a\u0308rchive.txt', 'combining-marks', 'a + combining diaeresis: identical glyph to ä, different bytes.')
add('e\u0301vent.log', 'combining-marks', 'e + combining acute; NFC-canonical twin of é.')
add('x\u0338fail.txt', 'combining-marks', 'x + combining long solidus overlay: looks like a struck-through x.')
add('A\u20DDot.txt', 'combining-marks', 'A + combining enclosing circle.')
add('o\u0323ption.txt', 'combining-marks', 'o + combining dot below.')
add('Z\u0336a\u0337l\u0361g\u035Bo\u0316.txt', 'combining-marks', 'Mild Zalgo: stacked combining marks; truncation mid-cluster produces broken glyphs.')
add('c\u0327e\u0301dule.txt', 'combining-marks', 'Stacked combining cedilla + acute in canonical order; reordering either mark yields an equal name under NFC.')
add('e\u0301\u0301rror.txt', 'combining-marks', 'Doubled combining acute: NFC does not deduplicate repeated marks.')

// --- emoji-zwj --------------------------------------------------------------
add('\u{1F468}\u200D\u{1F469}\u200D\u{1F467}.txt', 'emoji-zwj', 'Family emoji: three people joined by zero-width joiners; one grapheme, eight codepoints.')
add('\u{1F3F3}\uFE0F\u200D\u{1F308}.txt', 'emoji-zwj', 'Rainbow flag: white flag + VS16 + ZWJ + rainbow; splitting on codepoint boundaries corrupts it.')
add('\u{1F1F2}\u{1F1FD}.txt', 'emoji-zwj', 'Regional-indicator pair (MX flag); the same two indicators in reverse order is a different flag.')
add('\u{1F44D}\u{1F3FD}.txt', 'emoji-zwj', 'Thumbs-up + medium skin-tone modifier; modifiers attach without ZWJ.')
add('1\uFE0F\u20E3.txt', 'emoji-zwj', 'Keycap 1: digit + VS16 + combining enclosing keycap.')
add('\u{1F468}\u{1F3FB}\u200D\u{1F4BB}.txt', 'emoji-zwj', 'Man technologist: base + skin tone + ZWJ + laptop.')
add('\u2764\uFE0F\u200D\u{1F525}.txt', 'emoji-zwj', 'Heart on fire: heart + VS16 + ZWJ + flame.')
add('\u{1F4A9}.txt', 'emoji-zwj', 'Single emoji outside BMP; 4-byte UTF-8, surrogate pair in UTF-16 — truncation at byte 3 is invalid UTF-8.')

// --- bidi-rtl ---------------------------------------------------------------
add('file\u202Ename.txt', 'bidi-rtl', 'RIGHT-TO-LEFT OVERRIDE inside the name; renders "eman.txt" reversed in many UIs. Classic spoof.')
add('\u200Fstart.txt', 'bidi-rtl', 'Leading RIGHT-TO-LEFT MARK: invisible, but changes display order of mixed runs.')
add('\u05E9\u05DC\u05D5\u05DD.txt', 'bidi-rtl', 'Hebrew "shalom": pure RTL filename; sorts opposite to how it displays next to Latin names.')
add('\u0645\u0631\u062D\u0628\u0627.txt', 'bidi-rtl', 'Arabic "marhaba": RTL with shaping — the stored codepoints differ from the displayed glyphs.')
add('a\u202Db\u202Ec.txt', 'bidi-rtl', 'LEFT-TO-RIGHT OVERRIDE then RIGHT-TO-LEFT OVERRIDE: display order ≠ logical order.')
add('name\u2066LRI\u2069.txt', 'bidi-rtl', 'LEFT-TO-RIGHT ISOLATE + POP DIRECTIONAL ISOLATE (U+2066/U+2069).')
add('tail\u200F.txt', 'bidi-rtl', 'Trailing RLM: two names byte-different, visually identical.')
add('\u0663\u0665\u0669.txt', 'bidi-rtl', 'Arabic-Indic digits ٣٥٩: not ASCII 359; numeric parsers and humans both misread it.')

// --- control-chars ----------------------------------------------------------
add('li\nne.txt', 'control-chars', 'Embedded newline (illegal in Windows filenames): corrupts line-oriented logs, shell scripts, and CSV exports of file lists.', { platforms: ['darwin', 'linux'] })
add('ta\tb.txt', 'control-chars', 'Embedded tab: breaks column-aligned listings and tab-completion.', { platforms: ['darwin', 'linux'] })
add('es\x1Bc.txt', 'control-chars', 'Embedded ESC: terminal escape-injection vehicle when a tool prints filenames.', { platforms: ['darwin', 'linux'] })
add('de\x7Fl.txt', 'control-chars', 'Embedded DEL (U+007F).', { platforms: ['darwin', 'linux'] })
add('c1\x9B.txt', 'control-chars', 'C1 CSI (U+009B) — equivalent of ESC [ in a single byte of latin-1; escapes terminals that decode it.', { platforms: ['darwin', 'linux'] })
add('cr\rname.txt', 'control-chars', 'Embedded carriage return: overwrites the line in most terminals when printed.', { platforms: ['darwin', 'linux'] })
add('vt\x0Bname.txt', 'control-chars', 'Vertical tab in a name.', { platforms: ['darwin', 'linux'] })
add('ff\x0Cname.txt', 'control-chars', 'Form feed in a name; some terminals clear the screen.', { platforms: ['darwin', 'linux'] })

// --- bom-invisibles ---------------------------------------------------------
add('\uFEFFbom.txt', 'bom-invisibles', 'Leading BOM U+FEFF: invisible in editors, first byte differs.')
add('zw\u200Bsp.txt', 'bom-invisibles', 'Zero-width space U+200B: the most common invisible-difference bug in filenames and identifiers.')
add('zero\u200Cwidth\u200Djoin.txt', 'bom-invisibles', 'ZWNJ + ZWJ inside a name: both invisible, both semantically meaningful to Unicode algorithms.')
add('wj\u2060.txt', 'bom-invisibles', 'Word joiner U+2060: invisible no-break; equals nothing under any normalization.')
add('it\u2062times.txt', 'bom-invisibles', 'Invisible times U+2062.')
add('sep\u2063rated.txt', 'bom-invisibles', 'Invisible separator U+2063.')
add('mid\uFEFFbom.txt', 'bom-invisibles', 'BOM mid-name: equally invisible, breaks prefix/suffix matching.')
add('\u180Eseparator.txt', 'bom-invisibles', 'Mongolian vowel separator U+180E: was whitespace in older Unicode; now format char.')

// --- windows-reserved -------------------------------------------------------
add('CON', 'windows-reserved', 'DOS console device; on Windows this name resolves to a device, not a file.', { platforms: ['darwin', 'linux'] })
add('PRN', 'windows-reserved', 'DOS printer device: uncreatable as a filename on Windows for 40 years and counting.', { platforms: ['darwin', 'linux'] })
add('AUX', 'windows-reserved', 'DOS auxiliary device.', { platforms: ['darwin', 'linux'] })
add('NUL.dll', 'windows-reserved', 'NUL with an extension is still reserved on Windows.', { platforms: ['darwin', 'linux'] })
add('COM1.txt', 'windows-reserved', 'COM1 with extension: still resolves to the serial device on Windows.', { platforms: ['darwin', 'linux'] })
add('COM9', 'windows-reserved', 'Last classic COM slot.', { platforms: ['darwin', 'linux'] })
add('LPT1', 'windows-reserved', 'Parallel port device name.', { platforms: ['darwin', 'linux'] })
add('LPT2.out', 'windows-reserved', 'LPT2 with an extension: the suffix does not un-reserve the device name.', { platforms: ['darwin', 'linux'] })
add('CON.tar.gz', 'windows-reserved', 'CON at the start of a dotted name: still reserved — archives containing it fail to extract on Windows.', { platforms: ['darwin', 'linux'] })
add('aux.d', 'windows-reserved', 'AUX as a directory-style name; the Windows path bug class fixed in Kilo Code PR #7834.', { platforms: ['darwin', 'linux'] })
add('nul.txt', 'windows-reserved', 'Lowercase nul.txt is equally reserved.', { platforms: ['darwin', 'linux'] })
add('clock$.txt', 'windows-reserved', 'Historic NT 4 device name; still special in some layers.', { platforms: ['darwin', 'linux'] })

// --- trailing-separators ----------------------------------------------------
add('file. ', 'trailing-separators', 'Trailing dot+space: Win32 strips both, so the name roundtrips to "file" and back never matches.', { platforms: ['darwin', 'linux'] })
add('file..', 'trailing-separators', 'Trailing double dot: Windows strips all trailing dots.', { platforms: ['darwin', 'linux'] })
add('dir .', 'trailing-separators', 'Space before the trailing dot; stripped differently per API layer on Windows.', { platforms: ['darwin', 'linux'] })
add('trail ', 'trailing-separators', 'Trailing space alone: silently dropped by Win32, kept by POSIX.', { platforms: ['darwin', 'linux'] })
add('sp ace. ..', 'trailing-separators', 'Interior spaces plus trailing dot-dot-space soup.', { platforms: ['darwin', 'linux'] })
add('ends...', 'trailing-separators', 'Three trailing dots: Windows keeps exactly this name only through \\?\ paths.', { platforms: ['darwin', 'linux'] })

// --- separator-lookalikes ---------------------------------------------------
add('a:b.txt', 'separator-lookalikes', 'Colon in a name: legal on POSIX, a drive/ADS separator on Windows.', { platforms: ['darwin', 'linux'] })
add('C:\\drive.txt', 'separator-lookalikes', 'Literal backslash: a plain byte on POSIX, a path separator on Windows.', { platforms: ['darwin', 'linux'] })
add('\\leading.txt', 'separator-lookalikes', 'Leading backslash: absolute-path confusion on Windows.', { platforms: ['darwin', 'linux'] })
add('a\\b\\c.txt', 'separator-lookalikes', 'Backslashes mid-name: three components on Windows, one on POSIX.', { platforms: ['darwin', 'linux'] })
add('a:b:c.txt', 'separator-lookalikes', 'Two colons: NTFS sees stream separators, POSIX sees a weird name.', { platforms: ['darwin', 'linux'] })
add('\u29F8slash.txt', 'separator-lookalikes', 'Big solidus U+29F8: looks like /, is a math symbol.')
add('\uFF0Ffullwidth-slash.txt', 'separator-lookalikes', 'Fullwidth solidus U+FF0F: renders as a path separator, sorts as punctuation.')
add('\uFE68small-backslash.txt', 'separator-lookalikes', 'Small reverse solidus U+FE68.')

// --- length-limits ----------------------------------------------------------
add('a'.repeat(255) + '.txt', 'length-limits', '255 ASCII chars + ".txt" = 259 units: over the ext4 255-byte limit, over APFS 255-UTF-16-char limit, over classic Win32 MAX_PATH budget. Exists to test tool error handling.', { platforms: [] })
add('a'.repeat(255), 'length-limits', 'Exactly 255 bytes: the classic ext4 boundary — succeeds, but one more byte fails. Verified in CI: macOS bsdtar fails to restore AppleDouble metadata at this boundary because the "._" sidecar prefix overflows NAME_MAX (workaround: COPYFILE_DISABLE=1).', { platforms: ['darwin', 'linux', 'win32'] })
add('a'.repeat(256), 'length-limits', '256 bytes: fails on ext4 and (as 256 UTF-16 chars) on APFS; exists to test error handling.', { platforms: [] })
add('é'.repeat(100) + '.txt', 'length-limits', '100 é (200 UTF-8 bytes, 100 UTF-16 units): passes APFS, passes ext4, demonstrates units confusion.', { platforms: ['darwin', 'linux', 'win32'] })
add('\u{1F600}'.repeat(128) + '.txt', 'length-limits', '128 emoji (512 UTF-8 bytes, 256 UTF-16 units): over ext4 bytes AND APFS units; a 4-byte/2-unit divergence demo.', { platforms: [] })
add('\u{1F600}'.repeat(120) + '.txt', 'length-limits', '120 emoji (480 UTF-8 bytes, 240 UTF-16 units + ".txt"): within APFS, over ext4 — the exact OS-dependent split the corpus exists for.', { platforms: ['darwin', 'win32'] })

// --- case-collisions --------------------------------------------------------
add('README.txt', 'case-collisions', 'Uppercase twin; collides with lowercase sibling on case-insensitive filesystems.', { group: 'readme' })
add('readme.txt', 'case-collisions', 'Lowercase twin of README.txt.', { group: 'readme' })
add('Makefile', 'case-collisions', 'Uppercase twin; collides with Makefile on case-insensitive filesystems (macOS, Windows).', { group: 'makefile' })
add('MAKEFILE', 'case-collisions', 'Lowercase twin of MAKEFILE; both names coexist only on case-sensitive volumes.', { group: 'makefile' })
add('\u0130stanbul.txt', 'case-collisions', 'Dotted capital İ (U+0130): toLowerCase gives i + combining dot — not "i".', { group: 'istanbul' })
add('istanbul.txt', 'case-collisions', 'ASCII twin that İstanbul.toLowerCase() does NOT equal in a Turkish locale.', { group: 'istanbul' })
add('K.txt', 'case-collisions', 'Kelvin sign U+212A: case-folds to plain k — equal under caseless compare, different bytes.', { group: 'kelvin' })
add('k.txt', 'case-collisions', 'ASCII k; caseless twin of the Kelvin-sign name.', { group: 'kelvin' })

// --- locale-casing ----------------------------------------------------------
add('\u0131.txt', 'locale-casing', 'Dotless ı (U+0131): Turkish lowercase of I; toUpperCase gives İ, not I.')
add('I-dotted.txt', 'locale-casing', 'ASCII I with a tempting dotted sibling; locale-sensitive casing diverges.')
add('Diyarbak\u0131r.txt', 'locale-casing', 'Turkish place name with dotless ı; breaks case-insensitive dedupe under tr locale.')
add('stra\u00DFe.txt', 'locale-casing', 'ß: uppercase SS, so "STRASSE" equals it under full case folding but not byte compare.')

// --- width-twins ------------------------------------------------------------
add('\uFF21\uFF22\uFF23.txt', 'width-twins', 'Fullwidth ABC: looks like ABC in many fonts, sorts and matches nowhere near it.')
add('\uFF76\uFF9E\uFF80\uFF80.txt', 'width-twins', 'Halfwidth katakana ガンタ (ﾊﾞﾝﾀﾞﾑ-style): NFKC-folds to the fullwidth form.')
add('\u3000.txt', 'width-twins', 'Ideographic space U+3000 as the whole name: whitespace, but not the space bar.')
add('\uFF11\uFF12\uFF13.log', 'width-twins', 'Fullwidth digits １２３: numeric-looking, not parseable as numbers.')
add('\uFF27\uFF2F.md', 'width-twins', 'Fullwidth ＧＯ: looks like GO in CJK contexts, matches nothing in ASCII tooling.')
add('\uFF71\uFF9A\uFF7F.txt', 'width-twins', 'Halfwidth パス ("path").')
add('\uFF03tag.txt', 'width-twins', 'Fullwidth # : renders like a comment marker, hashes nothing.')
add('\uFF1D\uFF1D.txt', 'width-twins', 'Fullwidth ＝＝ pair: looks like a comparison operator, is two identifier letters.')

// --- cli-glob-hazards -------------------------------------------------------
add('--flag.txt', 'cli-glob-hazards', 'Leading dashes: naive shell-outs treat it as an option; needs ./ or -- separation.')
add('-rf', 'cli-glob-hazards', 'Exactly -rf: catastrophic as a bare argument to rm.')
add('*', 'cli-glob-hazards', 'Literal asterisk name: globs to every sibling if unquoted.', { platforms: ['darwin', 'linux'] })
add('?', 'cli-glob-hazards', 'Literal question mark: single-char glob.', { platforms: ['darwin', 'linux'] })
add('[a-z]', 'cli-glob-hazards', 'Literal bracket expression as a name.')
add('{a,b}', 'cli-glob-hazards', 'Brace expansion pattern as a name.')
add('$HOME.txt', 'cli-glob-hazards', 'Dollar-name: expands in unquoted shells.')
add('`tick`.txt', 'cli-glob-hazards', 'Backticks: command substitution in unquoted contexts.')
add('a;b.txt', 'cli-glob-hazards', 'Semicolon: statement separator injection.')
add('a|b.txt', 'cli-glob-hazards', 'Pipe: pipeline injection; also an illegal filename character on Windows.', { platforms: ['darwin', 'linux'] })
add('a>b.txt', 'cli-glob-hazards', 'Angle bracket: redirect injection; also an illegal filename character on Windows.', { platforms: ['darwin', 'linux'] })
add("a'quote.txt", 'cli-glob-hazards', 'Unbalanced single quote: breaks quoted shell composition.')
add('a"dquote.txt', 'cli-glob-hazards', 'Unbalanced double quote; the embedded quote is illegal in Windows filenames.', { platforms: ['darwin', 'linux'] })
add('..dotdot.txt', 'cli-glob-hazards', 'Leading .. — not a traversal, but rejected by paranoid validators; the false-positive twin of "../".')

// --- whitespace-lookalikes --------------------------------------------------
add('nb\u00A0sp.txt', 'whitespace-lookalikes', 'Non-breaking space U+00A0: the classic "why does this path not match" bug.')
add('thin\u2009sp.txt', 'whitespace-lookalikes', 'Thin space U+2009: invisible at normal sizes, breaks exact whitespace matching.')
add('en\u2002sp.txt', 'whitespace-lookalikes', 'En space U+2002: the width of a typeset N, and not the space bar.')
add('em\u2003sp.txt', 'whitespace-lookalikes', 'Em space U+2003: the widest common space; still equal to nothing under NFC.')
add('hair\u200Asp.txt', 'whitespace-lookalikes', 'Hair space U+200A: invisible at normal font sizes.')
add('  leading.txt', 'whitespace-lookalikes', 'Two leading ASCII spaces: legal, invisible in listings, trimmed by over-eager tools.')
add('trailing.txt  ', 'whitespace-lookalikes', 'Two trailing ASCII spaces; also Windows-stripped.', { platforms: ['darwin', 'linux'] })
add('   ', 'whitespace-lookalikes', 'Spaces-only name: whitespace, empty, and visible all at once; Win32 strips it to an empty name, so it is POSIX-only.', { platforms: ['darwin', 'linux'] })

// --- deep-nesting -----------------------------------------------------------
add('a/'.repeat(10) + 'leaf.txt', 'deep-nesting', '10-level tree; total path still short.')
add('d/'.repeat(30) + 'leaf.txt', 'deep-nesting', '30 levels: past some tool recursion limits, under OS limits.')
add('n/'.repeat(50) + 'leaf.txt', 'deep-nesting', '50 levels: each component legal, total path tests buffer sizes.')
add('z/'.repeat(100) + 'leaf.txt', 'deep-nesting', '100 levels (~201 bytes total): over the classic 4096-byte PATH_MAX only when components grow; breaks naive recursive walkers first.')

// --- legacy-mojibake --------------------------------------------------------
add('caf\u00C3\u00A9.txt', 'legacy-mojibake', 'Ã© — what "café" becomes after a latin-1→UTF-8 double encode; ubiquitous in rescued archives.')
add('\u00C3\u00B1.txt', 'legacy-mojibake', 'Ã± — what ñ becomes after a latin-1 to UTF-8 double encode; common in old archives.')
add('\uFFFDreplaced.txt', 'legacy-mojibake', 'U+FFFD replacement character: what losses look like after a bad conversion.')
add('\u0160\u0178\u00C5.txt', 'legacy-mojibake', 'ŠŸÅ — central-European mojibake cluster.')

// --- ntfs-streams -----------------------------------------------------------
add('file.txt:stream', 'ntfs-streams', 'On NTFS this creates an alternate data stream on file.txt, not a file; on POSIX it is one ordinary name.', { platforms: ['darwin', 'linux'] })
add('file.txt:$DATA', 'ntfs-streams', 'The ::$DATA stream suffix; reserved syntax on Windows.', { platforms: ['darwin', 'linux'] })
add('file:', 'ntfs-streams', 'Trailing colon: an empty stream name on NTFS, a valid POSIX name.', { platforms: ['darwin', 'linux'] })
add('photo.jpg:thumbnail', 'ntfs-streams', 'ADS used by Windows Explorer; archive tools disagree about what to store.', { platforms: ['darwin', 'linux'] })

// --- dash-confusables -------------------------------------------------------
add('soft\u00ADhyphen.txt', 'dash-confusables', 'Soft hyphen U+00AD: invisible, dropped by some renderers, kept in bytes.')
add('\u2010soft.txt', 'dash-confusables', 'Hyphen U+2010 vs ASCII -: flag parsers disagree.')
add('\u2011nonbreak.txt', 'dash-confusables', 'Non-breaking hyphen U+2011.')
add('\u2012figure.txt', 'dash-confusables', 'Figure dash U+2012: typographic digit-range dash, not a flag prefix or a minus.')
add('\u2013en.txt', 'dash-confusables', 'En dash U+2013: common in pasted text, not a flag prefix.')
add('\u2014em.txt', 'dash-confusables', 'Em dash U+2014: pasted prose uses it constantly; option parsers do not.')
add('\u2212minus.txt', 'dash-confusables', 'Minus sign U+2212: mathematically a hyphen, textually not one.', { group: 'minus' })
add('-hyphen.txt', 'dash-confusables', 'ASCII hyphen twin of the minus-sign name; equal to the eye, unequal to strcmp.', { group: 'minus' })

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

// Invisible/control/format characters that must be escaped in both outputs.
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

function escaped (s) {
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

// JSON with deterministic key order and \u-escaping for invisible chars.
function jsonStringify (value, indent) {
  const pad = ' '.repeat(indent)
  const padInner = ' '.repeat(indent + 2)
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    const items = value.map(v => padInner + jsonStringify(v, indent + 2))
    return '[\n' + items.join(',\n') + '\n' + pad + ']'
  }
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value)
    if (keys.length === 0) return '{}'
    const items = keys.map(k => padInner + JSON.stringify(k) + ': ' + jsonStringify(value[k], indent + 2))
    return '{\n' + items.join(',\n') + '\n' + pad + '}'
  }
  if (typeof value === 'string') {
    let out = ''
    for (const ch of value) {
      const cp = ch.codePointAt(0)
      if (escapeRanges(cp)) {
        if (cp > 0xFFFF) out += '\\u' + cp.toString(16).toUpperCase().padStart(4, '0') + '\\u' + ((cp - 0x10000) / 0x400 + 0xD800).toString(16).toUpperCase().padStart(4, '0') + '\\u' + ((cp - 0x10000) % 0x400 + 0xDC00).toString(16).toUpperCase().padStart(4, '0')
        else out += '\\u' + cp.toString(16).toUpperCase().padStart(4, '0')
      } else if (ch === '"') out += '\\"'
      else if (ch === '\\') out += '\\\\'
      else out += ch
    }
    return '"' + out + '"'
  }
  return JSON.stringify(value)
}

function buildJson () {
  const doc = {
    name: 'memex',
    version: VERSION,
    license: 'MIT',
    categories: CATEGORIES,
    entries,
    entryCount: entries.length,
  }
  return jsonStringify(doc, 0) + '\n'
}

function buildPlain () {
  const lines = []
  lines.push('# memex corpus v' + VERSION)
  lines.push('# One entry per line. Invisible characters appear as \\uXXXX escapes.')
  lines.push('# Format: <path>\\t<id> [category]')
  lines.push('# Generated by scripts/build-corpus.js — do not edit by hand.')
  lines.push('')
  for (const cat of CATEGORIES) {
    lines.push('# ' + cat.id)
    for (const e of entries.filter(e => e.category === cat.id)) {
      lines.push(escaped(e.path) + '\t' + e.id)
    }
    lines.push('')
  }
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const checkOnly = process.argv.includes('--check')
mkdirSync(CORPUS_DIR, { recursive: true })

const json = buildJson()
const plain = buildPlain()

if (checkOnly) {
  // Tolerate CRLF introduced by git autocrlf on Windows checkouts: the
  // builder always emits LF and .gitattributes pins eol=lf, but a
  // contributor with local overrides should get drift only from real
  // content changes, not line endings.
  const strip = (s) => s.replace(/\r\n/g, '\n')
  const onDiskJson = strip(readFileSync(join(CORPUS_DIR, 'corpus.json'), 'utf8'))
  const onDiskPlain = strip(readFileSync(join(CORPUS_DIR, 'PLAIN.txt'), 'utf8'))
  let ok = true
  if (onDiskJson !== json) {
    console.error('corpus/corpus.json is out of date. Run: npm run corpus:build')
    ok = false
  }
  if (onDiskPlain !== plain) {
    console.error('corpus/PLAIN.txt is out of date. Run: npm run corpus:build')
    ok = false
  }
  if (!ok) process.exit(1)
  console.log(`corpus OK: ${entries.length} entries across ${CATEGORIES.length} categories (in sync with builder)`)
  process.exit(0)
}

writeFileSync(join(CORPUS_DIR, 'corpus.json'), json)
writeFileSync(join(CORPUS_DIR, 'PLAIN.txt'), plain)
console.log(`wrote corpus/corpus.json and corpus/PLAIN.txt — ${entries.length} entries across ${CATEGORIES.length} categories`)
