let enabled = false

function timestamp(): string {
	return new Date().toISOString().slice(11, 23)
}

export const logger = {
	enable(): void {
		enabled = true
	},

	isEnabled(): boolean {
		return enabled
	},

	debug(label: string, message: string): void {
		if (!enabled) return
		process.stderr.write(`${timestamp()} [${label}] ${message}\n`)
	},
}
