import { compareAuditResults, findNewAdvisories } from './compare-audit'
import type { AuditAdvisory, AuditResult, OverrideEntry } from '../types'

function makeAuditResult(advisories: AuditAdvisory[]): AuditResult {
	const allSecurityIds = new Set<string>()
	for (const a of advisories) {
		for (const id of a.securityIds) allSecurityIds.add(id)
	}
	return { advisories, allSecurityIds, vulnerabilityCount: advisories.length }
}

function makeAdvisory(
	overrides: Partial<AuditAdvisory> & { source: number; securityIds: string[] },
): AuditAdvisory {
	return {
		name: 'pkg',
		title: 'Some vuln',
		url: '',
		severity: 'moderate',
		range: '<1.0.0',
		...overrides,
	}
}

const override: OverrideEntry = {
	key: 'qs',
	value: '>=6.14.2',
	note: 'Fix CVE-2025-15284',
	securityIds: ['CVE-2025-15284'],
}

describe('compareAuditResults', () => {
	it('returns safe_to_remove when no CVEs reappear and no new vulns', () => {
		const baseline = makeAuditResult([makeAdvisory({ source: 100, securityIds: ['CVE-OTHER'] })])
		const after = makeAuditResult([makeAdvisory({ source: 100, securityIds: ['CVE-OTHER'] })])

		const result = compareAuditResults(override, baseline, after)
		expect(result.verdict).toBe('safe_to_remove')
		expect(result.resurfacedIds).toEqual([])
		expect(result.newAdvisories).toEqual([])
	})

	it('returns required when the override CVE reappears', () => {
		const baseline = makeAuditResult([])
		const after = makeAuditResult([makeAdvisory({ source: 200, securityIds: ['CVE-2025-15284'] })])

		const result = compareAuditResults(override, baseline, after)
		expect(result.verdict).toBe('required')
		expect(result.resurfacedIds).toEqual(['CVE-2025-15284'])
		expect(result.reason).toContain('CVE-2025-15284')
	})

	it('returns required when new advisories appear even if original CVE does not', () => {
		const baseline = makeAuditResult([])
		const after = makeAuditResult([
			makeAdvisory({ source: 300, name: 'foo', securityIds: ['CVE-NEW-ONE'] }),
		])

		const result = compareAuditResults(override, baseline, after)
		expect(result.verdict).toBe('required')
		expect(result.newAdvisories).toHaveLength(1)
		expect(result.reason).toContain('new vulnerability')
	})

	it('returns safe_to_remove when after audit has same advisories as baseline', () => {
		const sharedAdvisory = makeAdvisory({ source: 100, securityIds: ['CVE-EXISTING'] })
		const baseline = makeAuditResult([sharedAdvisory])
		const after = makeAuditResult([sharedAdvisory])

		const result = compareAuditResults(override, baseline, after)
		expect(result.verdict).toBe('safe_to_remove')
	})

	it('prioritises resurfaced IDs over new advisories in verdict reason', () => {
		const baseline = makeAuditResult([])
		const after = makeAuditResult([
			makeAdvisory({ source: 400, securityIds: ['CVE-2025-15284', 'CVE-EXTRA'] }),
		])

		const result = compareAuditResults(override, baseline, after)
		expect(result.verdict).toBe('required')
		expect(result.reason).toMatch(/Removing reintroduces/)
	})
})

describe('findNewAdvisories', () => {
	it('returns empty when after is identical to baseline', () => {
		const advisory = makeAdvisory({ source: 100, securityIds: ['CVE-A'] })
		const baseline = makeAuditResult([advisory])
		const after = makeAuditResult([advisory])

		expect(findNewAdvisories(baseline, after)).toEqual([])
	})

	it('returns advisories with source IDs not in baseline', () => {
		const baseline = makeAuditResult([makeAdvisory({ source: 100, securityIds: ['CVE-A'] })])
		const after = makeAuditResult([
			makeAdvisory({ source: 100, securityIds: ['CVE-A'] }),
			makeAdvisory({ source: 200, securityIds: ['CVE-B'] }),
		])

		const result = findNewAdvisories(baseline, after)
		expect(result).toHaveLength(1)
		expect(result[0].securityIds).toContain('CVE-B')
	})

	it('returns empty when after has fewer advisories than baseline', () => {
		const baseline = makeAuditResult([
			makeAdvisory({ source: 100, securityIds: ['CVE-A'] }),
			makeAdvisory({ source: 200, securityIds: ['CVE-B'] }),
		])
		const after = makeAuditResult([makeAdvisory({ source: 100, securityIds: ['CVE-A'] })])

		expect(findNewAdvisories(baseline, after)).toEqual([])
	})

	it('uses security IDs as fallback when source is 0', () => {
		const baseline = makeAuditResult([makeAdvisory({ source: 0, securityIds: ['CVE-KNOWN'] })])
		const after = makeAuditResult([
			makeAdvisory({ source: 0, securityIds: ['CVE-KNOWN'] }),
			makeAdvisory({ source: 0, securityIds: ['CVE-UNKNOWN'] }),
		])

		const result = findNewAdvisories(baseline, after)
		expect(result).toHaveLength(1)
		expect(result[0].securityIds).toContain('CVE-UNKNOWN')
	})
})
