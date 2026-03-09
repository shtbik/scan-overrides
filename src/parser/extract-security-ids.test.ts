import { extractSecurityIds } from './extract-security-ids'

describe('extractSecurityIds', () => {
	it('extracts CVE identifiers', () => {
		const text = 'Pinned to fix CVE-2024-55565 (ReDoS vulnerability)'
		expect(extractSecurityIds(text)).toEqual(['CVE-2024-55565'])
	})

	it('extracts multiple CVEs from one string', () => {
		const text = 'Fix CVE-2025-6545 (CVSS 9.3) and CVE-2025-6547 (CVSS 9.1)'
		expect(extractSecurityIds(text)).toEqual(['CVE-2025-6545', 'CVE-2025-6547'])
	})

	it('extracts GHSA identifiers and uppercases them', () => {
		const text = 'See GHSA-8qq5-rm4j-mr97 for details'
		expect(extractSecurityIds(text)).toEqual(['GHSA-8QQ5-RM4J-MR97'])
	})

	it('extracts GHSA from advisory URLs', () => {
		const text = 'https://github.com/advisories/GHSA-8fgc-7cc6-rx7x'
		expect(extractSecurityIds(text)).toEqual(['GHSA-8FGC-7CC6-RX7X'])
	})

	it('extracts CWE identifiers', () => {
		const text = 'CWE-835 - Loop with Unreachable Exit Condition'
		expect(extractSecurityIds(text)).toEqual(['CWE-835'])
	})

	it('extracts mixed CVE, GHSA, and CWE from one string', () => {
		const text = 'Fix CVE-2026-26960 (GHSA-8qq5-rm4j-mr97) — CWE-22 arbitrary file read/write'
		const result = extractSecurityIds(text)
		expect(result).toContain('CVE-2026-26960')
		expect(result).toContain('GHSA-8QQ5-RM4J-MR97')
		expect(result).toContain('CWE-22')
	})

	it('deduplicates results', () => {
		const text = 'CVE-2024-23334 esbuild CVE-2024-23334 again'
		expect(extractSecurityIds(text)).toEqual(['CVE-2024-23334'])
	})

	it('returns empty array for text without security IDs', () => {
		expect(extractSecurityIds('Pinned for React 19 compatibility')).toEqual([])
	})

	it('returns empty array for empty string', () => {
		expect(extractSecurityIds('')).toEqual([])
	})
})
