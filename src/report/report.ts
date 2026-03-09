import type { AnalysisReport, OverrideAnalysisResult } from '../types'

const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'
const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const BLUE = '\x1b[34m'
const CYAN = '\x1b[36m'
const RESET = '\x1b[0m'

export function printProgress(
	index: number,
	total: number,
	key: string,
	phase: 'start' | 'install' | 'audit' | 'done',
	result?: OverrideAnalysisResult,
): void {
	const prefix = `${DIM}[${index + 1}/${total}]${RESET}`

	switch (phase) {
		case 'start':
			process.stdout.write(`\n${prefix} ${BOLD}${key}${RESET}\n`)
			process.stdout.write(`       Removing override...\n`)
			break
		case 'install':
			process.stdout.write(`       Resolving dependencies...\n`)
			break
		case 'audit':
			process.stdout.write(`       Running audit...\n`)
			break
		case 'done':
			if (result) {
				const icon =
					result.verdict === 'safe_to_remove'
						? `${GREEN}✓`
						: result.verdict === 'required'
							? `${RED}✗`
							: `${YELLOW}⚠`
				process.stdout.write(
					`       ${icon} ${result.verdict.toUpperCase().replace(/_/g, ' ')}${RESET} — ${result.reason}\n`,
				)
			}
			break
	}
}

export function printReport(report: AnalysisReport): void {
	const {
		total,
		safeToRemove,
		required,
		errors,
		results,
		skippedOverrides,
		removed,
		duration,
		baselineVulnCount,
	} = report

	console.log()
	console.log(`${BOLD}Analysis Summary${RESET}`)
	console.log('─'.repeat(50))
	console.log(`  Total analyzed:      ${total}`)
	console.log(`  ${GREEN}Safe to remove:${RESET}    ${safeToRemove}`)
	console.log(`  ${BLUE}Required:${RESET}          ${required}`)
	if (errors > 0) {
		console.log(`  ${YELLOW}Errors:${RESET}            ${errors}`)
	}
	console.log(`  Baseline vulns:      ${baselineVulnCount}`)
	console.log(`  Duration:            ${formatDuration(duration)}`)

	if (skippedOverrides.length > 0) {
		console.log()
		console.log(
			`${DIM}Skipped ${skippedOverrides.length} override(s) with no CVE/GHSA reference:${RESET}`,
		)
		for (const { key, value } of skippedOverrides) {
			console.log(`  ${DIM}• ${key}: ${value}${RESET}`)
		}
	}

	const safe = results.filter((r) => r.verdict === 'safe_to_remove')
	if (safe.length > 0) {
		console.log()
		if (removed.length > 0) {
			console.log(`${BOLD}${GREEN}Removed from package.json:${RESET}`)
		} else {
			console.log(`${BOLD}${GREEN}Safe to remove:${RESET}`)
		}
		console.log()
		for (const result of safe) {
			printSafeResult(result)
		}
	}

	const req = results.filter((r) => r.verdict === 'required')
	if (req.length > 0) {
		console.log()
		console.log(`${BOLD}${BLUE}Required (keep these):${RESET}`)
		console.log()
		for (const result of req) {
			printRequiredResult(result)
		}
	}

	const err = results.filter((r) => r.verdict === 'error')
	if (err.length > 0) {
		console.log()
		console.log(`${BOLD}${YELLOW}Errors:${RESET}`)
		console.log()
		for (const result of err) {
			console.log(
				`  ${YELLOW}⚠${RESET} ${BOLD}${result.override.key}${RESET}: ${result.override.value}`,
			)
			console.log(`    ${DIM}${result.reason}${RESET}`)
			console.log()
		}
	}

	if (safeToRemove === 0 && total > 0) {
		console.log()
		console.log(`${GREEN}All CVE-related overrides are still required. No cleanup needed.${RESET}`)
	} else if (safeToRemove > 0 && removed.length === 0) {
		console.log()
		console.log(
			`${DIM}Run with --fix to remove ${safeToRemove} redundant override(s) from package.json.${RESET}`,
		)
	}
}

function printSafeResult(result: OverrideAnalysisResult): void {
	console.log(`  ${GREEN}•${RESET} ${BOLD}${result.override.key}${RESET}: ${result.override.value}`)
	if (result.override.note) {
		console.log(`    ${DIM}Note: ${result.override.note}${RESET}`)
	}
	console.log(`    ${DIM}${result.reason}${RESET}`)
	console.log()
}

function printRequiredResult(result: OverrideAnalysisResult): void {
	console.log(`  ${BLUE}•${RESET} ${BOLD}${result.override.key}${RESET}: ${result.override.value}`)
	console.log(`    ${DIM}${result.reason}${RESET}`)
	if (result.resurfacedIds.length > 0) {
		console.log(`    ${RED}Resurfaced: ${result.resurfacedIds.join(', ')}${RESET}`)
	}
	if (result.newAdvisories.length > 0) {
		console.log(`    ${YELLOW}New vulnerabilities:${RESET}`)
		for (const adv of result.newAdvisories.slice(0, 5)) {
			console.log(`      ${CYAN}${adv.name}${RESET} ${adv.severity} — ${adv.title || adv.url}`)
		}
		if (result.newAdvisories.length > 5) {
			console.log(`      ${DIM}...and ${result.newAdvisories.length - 5} more${RESET}`)
		}
	}
	console.log()
}

export function printJsonReport(report: AnalysisReport): void {
	console.log(JSON.stringify(report, null, 2))
}

export function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`
	if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
	const minutes = Math.floor(ms / 60_000)
	const seconds = Math.round((ms % 60_000) / 1000)
	return `${minutes}m ${seconds}s`
}
