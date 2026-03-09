import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { OverrideEntry } from '../types'
import { extractSecurityIds } from './extract-security-ids'
import { logger } from '../util/logger'

type PnpmConfig = {
	overrides?: Record<string, string>
	overrideNotes?: Record<string, string>
}

type PackageJson = {
	pnpm?: PnpmConfig
	[key: string]: unknown
}

export type ParseResult = {
	overrides: OverrideEntry[]
	skipped: Array<{ key: string; value: string }>
}

export async function parseOverrides(
	projectDir: string,
	filter: string[] = [],
): Promise<ParseResult> {
	const packageJsonPath = join(projectDir, 'package.json')
	const content = await readFile(packageJsonPath, 'utf-8')
	const packageJson = JSON.parse(content) as PackageJson

	const pnpmConfig = packageJson.pnpm ?? {}
	const overrides = pnpmConfig.overrides ?? {}
	const notes = pnpmConfig.overrideNotes ?? {}

	logger.debug('parse', `Found ${Object.keys(overrides).length} total override(s)`)

	const result: OverrideEntry[] = []
	const skipped: Array<{ key: string; value: string }> = []

	for (const [key, value] of Object.entries(overrides)) {
		if (typeof value !== 'string') {
			logger.debug('parse', `Skipping non-string override: ${key}`)
			skipped.push({ key, value: String(value) })
			continue
		}

		if (filter.length > 0 && !filter.includes(key)) {
			logger.debug('parse', `Skipping (not in --filter list): ${key}`)
			skipped.push({ key, value })
			continue
		}

		const note = notes[key] as string | undefined
		const securityIds = note ? extractSecurityIds(note) : []

		if (securityIds.length === 0) {
			logger.debug('parse', `Skipping (no CVE/GHSA/CWE in note): ${key}`)
			skipped.push({ key, value })
			continue
		}

		logger.debug('parse', `Will analyze: ${key} → [${securityIds.join(', ')}]`)
		result.push({ key, value, note, securityIds })
	}

	return { overrides: result, skipped }
}
