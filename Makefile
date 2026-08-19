# badname — local dev entrypoints.
# CI runs the npm scripts directly; this Makefile is a convenience wrapper.

.PHONY: check test corpus build clean

# Full check: corpus in sync + tests + self-scan (same as CI).
check:
	npm run check

# Tests only.
test:
	npm test

# Regenerate corpus artifacts from the builder.
corpus:
	npm run corpus:build

# Verify committed corpus matches the builder (no writes).
corpus-check:
	npm run corpus:validate

clean:
	rm -rf node_modules package-lock.json
