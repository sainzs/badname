# macOS bsdtar writes NFD-decomposed filenames at extraction

**Status:** evidence complete, ready to file · **Target:** Apple Feedback
Assistant (primary — Apple's libarchive fork) and libarchive upstream (to
locate the responsible layer) · **Found by:** memex CI + local verification

## Summary

On macOS, the system `tar` (bsdtar 3.5.3, libarchive 3.7.4) extracts an
archive whose entry name is stored **NFC** (`café.txt`, U+00E9) but creates
the file on disk with the **NFD-decomposed** form (`cafe` + U+0301). The
archive bytes are faithful; the extraction path is not. APFS itself is
form-preserving (a plain `open()` of the NFC name keeps NFC), so the
decomposition happens inside the bsdtar/libarchive extraction path —
consistent with legacy HFS+ NFD behavior surviving into the APFS era.

## Reproduction (copy-paste)

```sh
cd "$(mktemp -d)"
printf 'x' > "caf$(printf '\u00e9').txt"        # NFC: ... 63 61 66 c3 a9 ...
COPYFILE_DISABLE=1 tar cf out.tar --exclude out.tar .
mkdir restored
COPYFILE_DISABLE=1 tar xf out.tar -C restored
python3 - <<'PY'
import os
b = [n for n in os.listdir('.') if n != 'out.tar'][0]
a = os.listdir('restored')[0]
print('on disk   :', b.encode('utf-8').hex(' '))
print('extracted :', a.encode('utf-8').hex(' '))
print('byte-equal:', b == a)
PY
```

Observed output (macOS 26.5, arm64, APFS):

```
on disk   : 63 61 66 c3 a9 2e 74 78 74      # café.txt, NFC (U+00E9)
extracted : 63 61 66 65 cc 81 2e 74 78 74   # cafe + U+0301, NFD
byte-equal: False
```

## Evidence that the archive is faithful (hexdump)

The 512-byte header blocks inside `out.tar` contain the NFC bytes:

```
ustar name field : 2e 2f 63 61 66 c3 a9 2e 74 78 74   → ./café.txt (NFC)
pax path record  : "20 path=./café.txt"               → NFC (c3 a9)
```

So the name is NFC at archive-create time *and* NFC inside the archive; only
the restored file is NFD.

## Environment

- macOS 26.5 (arm64), APFS volume
- bsdtar 3.5.3 - libarchive 3.7.4 zlib/1.2.12 liblzma/5.4.3 bz2lib/1.0.8
  (system `/usr/bin/tar`)
- Reproduced with and without `COPYFILE_DISABLE=1`
- Also reproduced on GitHub `macos-latest` runners (memex CI, 11 corpus
  fixtures NFC→NFD through `tar cf . && tar xf`)
- GNU tar on Linux preserves bytes (memex CI, ubuntu-latest: byte-exact)
- GNU tar on macOS: not tested (not installed here)

## Why it matters

A tarball created anywhere, extracted on macOS, yields NFD filenames. Then:

- `git status` shows phantom renames if the repo index holds NFC.
- Patch appliers that byte-compare paths (coding agents' `apply_patch` class,
  e.g. opencode#32216) fail to match files that visibly exist.
- `rsync`/`diff -r` between a macOS-extracted tree and a Linux-extracted one
  report every accented name as changed.
- macOS-created archives of NFD-on-disk names carry NFD to every platform.

## Question for maintainers

Is this intended HFS+-compatibility behavior, or a bug in the Darwin
extraction path? If intended, is there a supported way to request
byte-preserving extraction (none is documented in `man tar`)?

## Corpus reference

Reproduced by `memex seed && memex roundtrip` (the `unicode-normalization`
fixtures) — https://github.com/sainzs/memex
