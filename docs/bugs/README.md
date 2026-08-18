# Verified findings

File-anything bug reports produced by the memex corpus and harness. Each has
a copy-paste reproduction and was verified on real hardware/CI before
writing. Filing status is tracked here.

| Finding | Where to file | Status |
| --- | --- | --- |
| [bsdtar extracts NFC archive names as NFD on disk](apple-bsdtar-nfd-extraction.md) | Apple Feedback Assistant + [libarchive](https://github.com/libarchive/libarchive/issues) | ready to file |
| [AppleDouble metadata restore overflows NAME_MAX at 255-byte names](apple-bsdtar-appledouble-namemax.md) | Apple Feedback Assistant | ready to file |

## Filing notes (maintainer of this repo)

- **Apple**: Feedback Assistant (https://feedbackassistant.apple.com) requires
  an Apple ID — paste the report body, attach the repro output. Cross-post
  the NFD finding to libarchive upstream so the responsible layer (Apple fork
  vs. upstream) gets located; upstream may redirect to Apple, which is itself
  useful information.
- Fill the **Status** column with links once filed; link the filings from the
  README "Provenance" section — upstream-acknowledged reports are the
  corpus's strongest evidence.
- Each report intentionally follows this repo's own contribution bar: minimal
  repro, byte-level evidence, environment, no diagnosis-overreach.
