# scan-overrides

CLI tool that scans `pnpm.overrides` entries and determines whether CVE-related
overrides can be safely removed by running `pnpm audit` without them.

## Why?

pnpm overrides are useful for patching security vulnerabilities in transitive
dependencies. Over time these overrides become stale as upstream packages ship
fixes. `scan-overrides` automates the detection of obsolete overrides so you can
clean them up with confidence.

## How it works

For each override that has a security reference (CVE/GHSA/CWE) in
`pnpm.overrideNotes`:

1. Copies `package.json`, `pnpm-lock.yaml`, `.npmrc`, and `patches/` to a temp
   directory
2. Runs a **baseline** `pnpm audit --json`
3. Removes the override from `package.json`
4. Runs `pnpm install --lockfile-only` to re-resolve dependencies
5. Runs `pnpm audit --json` again
6. Compares the two audit reports:
   - If the override's CVE/GHSA reappears → **required**
   - If new vulnerabilities appear that weren't in the baseline → **required**
   - If neither → **safe to remove**

Overrides without a CVE/GHSA/CWE reference in their `overrideNotes` entry are
skipped — the audit-based approach only applies to security overrides.

## Install

```bash
# Run directly
npx scan-overrides

# Or install globally
npm install -g scan-overrides

# Or add as a devDependency
pnpm add -D scan-overrides
```

## Usage

```bash
# Scan all CVE-related overrides
scan-overrides

# Scan a single override
scan-overrides --only "semver"
scan-overrides --only "@vercel/gatsby-plugin-vercel-builder>esbuild"

# Scan multiple specific overrides
scan-overrides --only "semver" --only "qs"

# JSON output (for CI pipelines)
scan-overrides --json

# Debug mode (detailed logs to stderr)
scan-overrides --debug

# Combine options
scan-overrides --only "qs" --debug
```

## Options

| Option         | Description                                       |
| -------------- | ------------------------------------------------- |
| `--only <key>` | Only analyze specific override(s). Repeatable.    |
| `--json`       | Output results as JSON.                           |
| `--debug`      | Print detailed debug logs to stderr.              |
| `--cwd <path>` | Project directory (defaults to current directory). |
| `--help`       | Show usage information.                           |

## Exit codes

| Code | Meaning                                   |
| ---- | ----------------------------------------- |
| 0    | No redundant overrides found.             |
| 1    | One or more overrides are safe to remove. |
| 2    | Fatal error.                              |

## Programmatic API

```typescript
import { analyze } from 'scan-overrides'
import type { AnalysisReport } from 'scan-overrides/types'

const report: AnalysisReport = await analyze('/path/to/project')

for (const result of report.results) {
  if (result.verdict === 'safe_to_remove') {
    console.log(`${result.override.key} can be removed`)
  }
}
```

## Requirements

- **pnpm** available in `PATH`
- `pnpm.overrideNotes` in `package.json` with CVE/GHSA/CWE references for the
  overrides you want to scan

The tool matches security identifiers using these patterns:

- `CVE-YYYY-NNNNN` (e.g., `CVE-2024-23334`)
- `GHSA-xxxx-xxxx-xxxx` (e.g., `GHSA-8qq5-rm4j-mr97`)
- `CWE-NNN` (e.g., `CWE-835`)

## Example `package.json` setup

```json
{
  "pnpm": {
    "overrideNotes": {
      "semver": "Pinned to fix CVE-2024-55565 (ReDoS vulnerability)",
      "qs": "Fix CVE-2025-15284 (CVSS 7.5) - arrayLimit bypass"
    },
    "overrides": {
      "semver": "^7.7.2",
      "qs": ">=6.14.2"
    }
  }
}
```

## Limitations

- **pnpm only** — does not support npm or yarn overrides/resolutions (yet)

## Acknowledgements

Inspired by [prune-overrides](https://github.com/PKief/prune-overrides) by
[@PKief](https://github.com/PKief), which does the same for npm overrides using
version comparison. `scan-overrides` takes a CVE-first approach with `pnpm audit`
to verify whether security-related overrides are still needed.

## License

MIT
