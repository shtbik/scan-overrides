import { resolve } from 'node:path'
import type { CliOptions } from '../types'

export function parseArgs(argv: string[]): CliOptions {
	const args = argv.slice(2)

	const isJson = args.includes('--json')
	const isDebug = args.includes('--debug')
	const isFix = args.includes('--fix')

	let projectDir = process.cwd()
	const filter: string[] = []

	for (let i = 0; i < args.length; i++) {
		const arg = args[i]
		const next = args[i + 1]

		if (arg === '--cwd' && next) {
			projectDir = next
			i++
		}

		if (arg === '--filter' && next) {
			for (const key of next.split(',')) {
				const trimmed = key.trim()
				if (trimmed) filter.push(trimmed)
			}
			i++
		}
	}

	return {
		projectDir: resolve(projectDir),
		isJson,
		isDebug,
		isFix,
		filter,
	}
}

export function printUsage(): void {
	console.log(`
Usage: scan-overrides [options]

Scans pnpm overrides that reference CVE/GHSA/CWE identifiers and checks
whether each is still needed by running pnpm audit without it.

Options:
  --filter <keys>  Only analyze specific override(s), comma-separated. Each key
                   must match a pnpm.overrides key in package.json exactly.
                   Example: --filter "semver,qs"
                   Example: --filter "@vercel/node>esbuild"
  --fix            Remove safe-to-remove overrides from package.json
  --json           Output results as JSON
  --debug          Print detailed debug logs to stderr
  --cwd <path>     Project directory (defaults to cwd)
  --help           Show this help message
`)
}
