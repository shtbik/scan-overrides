import { resolve } from 'node:path'
import type { CliOptions } from '../types'

export function parseArgs(argv: string[]): CliOptions {
	const args = argv.slice(2)

	const isJson = args.includes('--json')
	const isDebug = args.includes('--debug')

	let projectDir = process.cwd()
	const only: string[] = []

	for (let i = 0; i < args.length; i++) {
		const arg = args[i]
		const next = args[i + 1]

		if (arg === '--cwd' && next) {
			projectDir = next
			i++
		}

		if (arg === '--only' && next) {
			only.push(next)
			i++
		}
	}

	return {
		projectDir: resolve(projectDir),
		isJson,
		isDebug,
		only,
	}
}

export function printUsage(): void {
	console.log(`
Usage: scan-overrides [options]

Scans pnpm overrides that reference CVE/GHSA/CWE identifiers and checks
whether each is still needed by running pnpm audit without it.

Options:
  --only <key>   Only analyze a specific override (repeatable)
                 Example: --only "semver" --only "qs"
                 Example: --only "@vercel/gatsby-plugin-vercel-builder>esbuild"
  --json         Output results as JSON
  --debug        Print detailed debug logs to stderr
  --cwd <path>   Project directory (defaults to cwd)
  --help         Show this help message
`)
}
