#!/usr/bin/env node
import { parseArgs, printUsage } from './cli/parse-args'
import { logger } from './util/logger'
import { analyze } from './analyzer/analyze'
import { removeOverridesFromProject } from './workspace/temp-workspace'
import { printProgress, printReport, printJsonReport } from './report/report'
import type { OverrideEntry, OverrideAnalysisResult } from './types'

const options = parseArgs(process.argv)

if (process.argv.includes('--help')) {
	printUsage()
	process.exit(0)
}

if (options.isDebug) {
	logger.enable()
}

async function main(): Promise<void> {
	if (!options.isJson) {
		console.log(`\nScanning pnpm overrides in ${options.projectDir}...\n`)
		if (options.filter.length > 0) {
			console.log(`Filtering to: ${options.filter.join(', ')}\n`)
		}
	}

	const onProgress = options.isJson
		? undefined
		: (
				index: number,
				total: number,
				override: OverrideEntry,
				phase: 'start' | 'install' | 'audit' | 'done',
				result?: OverrideAnalysisResult,
			) => {
				printProgress(index, total, override.key, phase, result)
			}

	const report = await analyze(options.projectDir, options.filter, onProgress)

	const safeKeys = report.results
		.filter((r) => r.verdict === 'safe_to_remove')
		.map((r) => r.override.key)

	if (safeKeys.length > 0 && options.isFix) {
		await removeOverridesFromProject(options.projectDir, safeKeys)
		report.removed = safeKeys
	}

	if (options.isJson) {
		printJsonReport(report)
	} else {
		printReport(report)
	}

	process.exit(report.safeToRemove > 0 ? 1 : 0)
}

main().catch((error: unknown) => {
	console.error('Fatal error:', error instanceof Error ? error.message : error)
	process.exit(2)
})
