import type { AuditAdvisory, AuditResult } from '../types'
import { extractSecurityIds } from './extract-security-ids'

export function parseAuditOutput(raw: unknown): AuditResult {
	if (typeof raw !== 'object' || raw === null) {
		return emptyResult()
	}

	const obj = raw as Record<string, unknown>

	if (obj.advisories && typeof obj.advisories === 'object') {
		return parseV1Format(obj.advisories as Record<string, unknown>)
	}

	if (obj.vulnerabilities && typeof obj.vulnerabilities === 'object') {
		return parseV2Format(obj.vulnerabilities as Record<string, unknown>)
	}

	return emptyResult()
}

/**
 * v1 format: `{ advisories: { "12345": { id, title, cves, github_advisory_id, ... } } }`
 * Used by pnpm audit as of pnpm 10.
 */
export function parseV1Format(rawAdvisories: Record<string, unknown>): AuditResult {
	const allSecurityIds = new Set<string>()
	const advisories: AuditAdvisory[] = []

	for (const adv of Object.values(rawAdvisories)) {
		if (typeof adv !== 'object' || adv === null) continue
		const a = adv as Record<string, unknown>

		const ids: string[] = []

		if (Array.isArray(a.cves)) {
			for (const c of a.cves) {
				if (typeof c === 'string') ids.push(c)
			}
		}
		if (typeof a.github_advisory_id === 'string' && a.github_advisory_id) {
			ids.push(a.github_advisory_id.toUpperCase())
		}
		if (typeof a.url === 'string') {
			ids.push(...extractSecurityIds(a.url))
		}
		if (typeof a.title === 'string') {
			ids.push(...extractSecurityIds(a.title))
		}
		if (Array.isArray(a.cwe)) {
			for (const c of a.cwe) {
				if (typeof c === 'string') ids.push(c)
			}
		}

		const uniqueIds = [...new Set(ids)]
		for (const id of uniqueIds) allSecurityIds.add(id)

		advisories.push({
			source: typeof a.id === 'number' ? a.id : 0,
			name: typeof a.module_name === 'string' ? a.module_name : '',
			title: typeof a.title === 'string' ? a.title : '',
			url: typeof a.url === 'string' ? a.url : '',
			severity: typeof a.severity === 'string' ? a.severity : 'unknown',
			range: typeof a.vulnerable_versions === 'string' ? a.vulnerable_versions : '',
			securityIds: uniqueIds,
		})
	}

	return { advisories, allSecurityIds, vulnerabilityCount: advisories.length }
}

/**
 * v2 format: `{ vulnerabilities: { "pkg": { via: [...], severity, range } } }`
 * Used by npm audit v7+ — kept as fallback in case pnpm switches formats.
 */
export function parseV2Format(vulns: Record<string, unknown>): AuditResult {
	const allSecurityIds = new Set<string>()
	const advisories: AuditAdvisory[] = []

	for (const [pkgName, vuln] of Object.entries(vulns)) {
		if (typeof vuln !== 'object' || vuln === null) continue
		const vulnObj = vuln as Record<string, unknown>
		const via = vulnObj.via as unknown[]
		if (!Array.isArray(via)) continue

		for (const entry of via) {
			if (typeof entry === 'string') continue
			if (typeof entry !== 'object' || entry === null) continue

			const advisory = entry as Record<string, unknown>
			const ids: string[] = []

			if (typeof advisory.url === 'string') {
				ids.push(...extractSecurityIds(advisory.url))
			}
			if (typeof advisory.title === 'string') {
				ids.push(...extractSecurityIds(advisory.title))
			}
			if (Array.isArray(advisory.cwe)) {
				for (const c of advisory.cwe) {
					if (typeof c === 'string') ids.push(c)
				}
			}

			const uniqueIds = [...new Set(ids)]
			for (const id of uniqueIds) allSecurityIds.add(id)

			advisories.push({
				source: typeof advisory.source === 'number' ? advisory.source : 0,
				name: typeof advisory.name === 'string' ? advisory.name : pkgName,
				title: typeof advisory.title === 'string' ? advisory.title : '',
				url: typeof advisory.url === 'string' ? advisory.url : '',
				severity: typeof advisory.severity === 'string' ? advisory.severity : 'unknown',
				range: typeof advisory.range === 'string' ? advisory.range : '',
				securityIds: uniqueIds,
			})
		}
	}

	return { advisories, allSecurityIds, vulnerabilityCount: Object.keys(vulns).length }
}

function emptyResult(): AuditResult {
	return { advisories: [], allSecurityIds: new Set(), vulnerabilityCount: 0 }
}
