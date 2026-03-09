import type { AnalysisReport, AuditResult, OverrideAnalysisResult, OverrideEntry } from '../types'
import { parseOverrides } from '../parser/parse-overrides'
import { pnpmAudit, pnpmInstallLockfileOnly } from '../pnpm/pnpm'
import { createTempWorkspace, removeOverrideFromPackageJson } from '../workspace/temp-workspace'
import { compareAuditResults } from './compare-audit'
import { logger } from '../util/logger'

export type ProgressCallback = (
	index: number,
	total: number,
	override: OverrideEntry,
	phase: 'start' | 'install' | 'audit' | 'done',
	result?: OverrideAnalysisResult,
) => void

export async function analyze(
	projectDir: string,
	filter: string[] = [],
	onProgress?: ProgressCallback,
): Promise<AnalysisReport> {
	const startTime = Date.now()

	const { overrides, skipped } = await parseOverrides(projectDir, filter)

	if (overrides.length === 0) {
		return {
			total: 0,
			safeToRemove: 0,
			required: 0,
			errors: 0,
			results: [],
			skippedOverrides: skipped,
			removed: [],
			duration: Date.now() - startTime,
			baselineVulnCount: 0,
		}
	}

	const workspace = await createTempWorkspace(projectDir)

	try {
		logger.debug('analyze', 'Running baseline audit...')
		const baselineAudit = await pnpmAudit(workspace.path)
		logger.debug(
			'analyze',
			`Baseline: ${baselineAudit.vulnerabilityCount} vulns, IDs: [${[...baselineAudit.allSecurityIds].join(', ')}]`,
		)

		const results: OverrideAnalysisResult[] = []

		for (let i = 0; i < overrides.length; i++) {
			const override = overrides[i]
			onProgress?.(i, overrides.length, override, 'start')

			logger.debug('analyze', `--- Analyzing [${i + 1}/${overrides.length}]: ${override.key} ---`)

			const result = await analyzeSingleOverride(workspace, override, baselineAudit, (phase) =>
				onProgress?.(i, overrides.length, override, phase),
			)

			logger.debug('analyze', `Verdict: ${result.verdict} — ${result.reason}`)
			results.push(result)
			onProgress?.(i, overrides.length, override, 'done', result)
		}

		return {
			total: results.length,
			safeToRemove: results.filter((r) => r.verdict === 'safe_to_remove').length,
			required: results.filter((r) => r.verdict === 'required').length,
			errors: results.filter((r) => r.verdict === 'error').length,
			results,
			skippedOverrides: skipped,
			removed: [],
			duration: Date.now() - startTime,
			baselineVulnCount: baselineAudit.vulnerabilityCount,
		}
	} finally {
		await workspace.cleanup()
	}
}

async function analyzeSingleOverride(
	workspace: { path: string; restoreOriginals: () => Promise<void> },
	override: OverrideEntry,
	baselineAudit: AuditResult,
	onPhase: (phase: 'install' | 'audit') => void,
): Promise<OverrideAnalysisResult> {
	try {
		await workspace.restoreOriginals()
		await removeOverrideFromPackageJson(workspace.path, override.key)

		onPhase('install')
		const installResult = await pnpmInstallLockfileOnly(workspace.path)

		if (!installResult.isSuccess) {
			return {
				override,
				verdict: 'required',
				reason: `pnpm install fails without this override: ${installResult.error?.slice(0, 200) ?? 'unknown error'}`,
				resurfacedIds: [],
				newAdvisories: [],
			}
		}

		onPhase('audit')
		const afterAudit = await pnpmAudit(workspace.path)

		logger.debug(
			'analyze',
			`After removing "${override.key}": ${afterAudit.vulnerabilityCount} vulns, IDs: [${[...afterAudit.allSecurityIds].join(', ')}]`,
		)

		return compareAuditResults(override, baselineAudit, afterAudit)
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error)
		return {
			override,
			verdict: 'error',
			reason: `Analysis failed: ${message.slice(0, 200)}`,
			resurfacedIds: [],
			newAdvisories: [],
		}
	}
}
