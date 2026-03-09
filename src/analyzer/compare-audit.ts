import type { AuditAdvisory, AuditResult, OverrideAnalysisResult, OverrideEntry } from '../types'

export function compareAuditResults(
	override: OverrideEntry,
	baseline: AuditResult,
	after: AuditResult,
): OverrideAnalysisResult {
	const resurfacedIds = override.securityIds.filter((id) => after.allSecurityIds.has(id))
	const newAdvisories = findNewAdvisories(baseline, after)

	if (resurfacedIds.length > 0) {
		return {
			override,
			verdict: 'required',
			reason: `Removing reintroduces: ${resurfacedIds.join(', ')}`,
			resurfacedIds,
			newAdvisories,
		}
	}

	if (newAdvisories.length > 0) {
		const summaries = newAdvisories
			.slice(0, 3)
			.map((a) => `${a.name} (${a.severity}: ${a.title || a.url})`)
		const suffix = newAdvisories.length > 3 ? ` and ${newAdvisories.length - 3} more` : ''
		return {
			override,
			verdict: 'required',
			reason: `Removing introduces ${newAdvisories.length} new vulnerability(s): ${summaries.join('; ')}${suffix}`,
			resurfacedIds,
			newAdvisories,
		}
	}

	return {
		override,
		verdict: 'safe_to_remove',
		reason: 'No vulnerabilities reappear and no new ones are introduced',
		resurfacedIds: [],
		newAdvisories: [],
	}
}

/**
 * Advisories present in `after` but not in `baseline`.
 * Matched by source ID (advisory number) to avoid false positives
 * from ID extraction mismatches.
 */
export function findNewAdvisories(baseline: AuditResult, after: AuditResult): AuditAdvisory[] {
	const baselineSources = new Set(baseline.advisories.map((a) => a.source))
	const baselineIds = baseline.allSecurityIds

	return after.advisories.filter((a) => {
		if (a.source !== 0 && baselineSources.has(a.source)) return false

		const hasNewId = a.securityIds.some((id) => !baselineIds.has(id))
		if (a.source === 0) return hasNewId

		return true
	})
}
