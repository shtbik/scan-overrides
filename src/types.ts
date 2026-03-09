export type OverrideEntry = {
	key: string
	value: string
	note: string | undefined
	securityIds: string[]
}

export type AuditAdvisory = {
	source: number
	name: string
	title: string
	url: string
	severity: string
	range: string
	securityIds: string[]
}

export type AuditResult = {
	advisories: AuditAdvisory[]
	allSecurityIds: Set<string>
	vulnerabilityCount: number
}

export type OverrideVerdict = 'safe_to_remove' | 'required' | 'error'

export type OverrideAnalysisResult = {
	override: OverrideEntry
	verdict: OverrideVerdict
	reason: string
	resurfacedIds: string[]
	newAdvisories: AuditAdvisory[]
}

export type AnalysisReport = {
	total: number
	safeToRemove: number
	required: number
	errors: number
	results: OverrideAnalysisResult[]
	skippedOverrides: Array<{ key: string; value: string }>
	duration: number
	baselineVulnCount: number
}

export type CliOptions = {
	projectDir: string
	isJson: boolean
	isDebug: boolean
	only: string[]
}

export type { ProgressCallback } from './analyzer/analyze'
