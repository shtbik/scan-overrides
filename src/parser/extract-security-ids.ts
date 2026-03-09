const CVE_PATTERN = /CVE-\d{4}-\d+/g
const GHSA_PATTERN = /GHSA-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+/gi
const CWE_PATTERN = /CWE-\d+/g

export function extractSecurityIds(text: string): string[] {
	const cves = text.match(CVE_PATTERN) ?? []
	const ghsas = text.match(GHSA_PATTERN) ?? []
	const cwes = text.match(CWE_PATTERN) ?? []
	return [...new Set([...cves, ...ghsas.map((g) => g.toUpperCase()), ...cwes])]
}
