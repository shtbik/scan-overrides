import { parseAuditOutput, parseV1Format, parseV2Format } from './parse-audit'

describe('parseAuditOutput', () => {
	it('returns empty result for null input', () => {
		const result = parseAuditOutput(null)
		expect(result.advisories).toEqual([])
		expect(result.allSecurityIds.size).toBe(0)
		expect(result.vulnerabilityCount).toBe(0)
	})

	it('returns empty result for non-object input', () => {
		const result = parseAuditOutput('not an object')
		expect(result.advisories).toEqual([])
	})

	it('returns empty result for object without advisories or vulnerabilities', () => {
		const result = parseAuditOutput({ actions: [] })
		expect(result.advisories).toEqual([])
	})

	it('routes to v1 parser when advisories field exists', () => {
		const input = {
			advisories: {
				'12345': {
					id: 12345,
					module_name: 'qs',
					title: 'DoS via arrayLimit bypass',
					cves: ['CVE-2025-15284'],
					github_advisory_id: 'GHSA-abcd-efgh-ijkl',
					severity: 'moderate',
					vulnerable_versions: '<6.14.2',
					url: 'https://github.com/advisories/GHSA-abcd-efgh-ijkl',
					cwe: ['CWE-400'],
				},
			},
		}
		const result = parseAuditOutput(input)
		expect(result.advisories).toHaveLength(1)
		expect(result.advisories[0].name).toBe('qs')
		expect(result.allSecurityIds.has('CVE-2025-15284')).toBe(true)
	})

	it('routes to v2 parser when vulnerabilities field exists', () => {
		const input = {
			vulnerabilities: {
				qs: {
					via: [
						{
							source: 12345,
							name: 'qs',
							title: 'DoS CVE-2025-15284',
							url: 'https://github.com/advisories/GHSA-abcd-efgh-ijkl',
							severity: 'moderate',
							cwe: ['CWE-400'],
							range: '<6.14.2',
						},
					],
				},
			},
		}
		const result = parseAuditOutput(input)
		expect(result.advisories).toHaveLength(1)
		expect(result.allSecurityIds.has('CVE-2025-15284')).toBe(true)
	})
})

describe('parseV1Format', () => {
	it('extracts all ID types from v1 advisory', () => {
		const advisories = {
			'1001': {
				id: 1001,
				module_name: 'webpack',
				title: 'webpack SSRF via CVE-2025-68458',
				cves: ['CVE-2025-68458'],
				github_advisory_id: 'GHSA-8fgc-7cc6-rx7x',
				severity: 'low',
				vulnerable_versions: '>=5.49.0 <=5.104.0',
				url: 'https://github.com/advisories/GHSA-8fgc-7cc6-rx7x',
				cwe: ['CWE-918'],
			},
		}

		const result = parseV1Format(advisories)
		expect(result.advisories).toHaveLength(1)
		expect(result.advisories[0].source).toBe(1001)
		expect(result.advisories[0].name).toBe('webpack')
		expect(result.advisories[0].severity).toBe('low')

		expect(result.allSecurityIds.has('CVE-2025-68458')).toBe(true)
		expect(result.allSecurityIds.has('GHSA-8FGC-7CC6-RX7X')).toBe(true)
		expect(result.allSecurityIds.has('CWE-918')).toBe(true)
	})

	it('handles multiple advisories', () => {
		const advisories = {
			'1001': {
				id: 1001,
				module_name: 'foo',
				cves: ['CVE-2024-0001'],
				severity: 'high',
			},
			'1002': {
				id: 1002,
				module_name: 'bar',
				cves: ['CVE-2024-0002'],
				severity: 'critical',
			},
		}

		const result = parseV1Format(advisories)
		expect(result.advisories).toHaveLength(2)
		expect(result.vulnerabilityCount).toBe(2)
		expect(result.allSecurityIds.has('CVE-2024-0001')).toBe(true)
		expect(result.allSecurityIds.has('CVE-2024-0002')).toBe(true)
	})

	it('skips non-object entries', () => {
		const advisories = { bad: 'not an object' } as unknown as Record<string, unknown>
		const result = parseV1Format(advisories)
		expect(result.advisories).toHaveLength(0)
	})
})

describe('parseV2Format', () => {
	it('skips string via entries (indirect references)', () => {
		const vulns = {
			foo: {
				via: ['bar'],
				severity: 'high',
			},
		}
		const result = parseV2Format(vulns)
		expect(result.advisories).toHaveLength(0)
	})

	it('extracts advisory details from via objects', () => {
		const vulns = {
			undici: {
				via: [
					{
						source: 5555,
						name: 'undici',
						title: 'Unbounded decompression',
						url: 'https://github.com/advisories/GHSA-xxxx-yyyy-zzzz',
						severity: 'moderate',
						cwe: ['CWE-400'],
						range: '<6.23.0',
					},
				],
			},
		}

		const result = parseV2Format(vulns)
		expect(result.advisories).toHaveLength(1)
		expect(result.advisories[0].source).toBe(5555)
		expect(result.advisories[0].name).toBe('undici')
		expect(result.allSecurityIds.has('GHSA-XXXX-YYYY-ZZZZ')).toBe(true)
		expect(result.allSecurityIds.has('CWE-400')).toBe(true)
	})
})
