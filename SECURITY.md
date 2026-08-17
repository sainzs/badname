# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| 0.1.x | yes |

## Reporting a vulnerability

This project is a test corpus and CLI. If you find a way for it to damage a
system — a fixture that escapes the sandbox, a command-injection path in the
harness, or content that crashes common terminals when printed — please
report it privately using [GitHub security advisories](https://github.com/sainzs/pathological/security/advisories/new).

Please do not open a public issue for anything that could affect users'
machines.

## Safety model

- `check` is strictly read-only.
- `seed` only writes into an empty or nonexistent directory, validates every
  entry path against absolute paths and `..` traversal, and creates files with
  exclusive (`wx`) semantics.
- `roundtrip` runs your command inside a fresh temp directory seeded with
  fixtures; the command is yours and runs with your shell — treat the sandbox
  like any script you paste from the internet.
- Corpus entries that embed terminal escape characters are escaped in all
  human-readable output (`\uXXXX`) so printing reports cannot inject escapes.
