import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { AuditResult } from '../types'
import { parseAuditOutput } from '../parser/parse-audit'
import { logger } from '../util/logger'

const execFileAsync = promisify(execFile)

const MAX_BUFFER = 50 * 1024 * 1024
const INSTALL_TIMEOUT = 300_000
const AUDIT_TIMEOUT = 120_000

type ExecError = Error & { stdout?: string; stderr?: string; code?: number }

/**
 * pnpm audit exits non-zero when vulnerabilities exist,
 * so we capture stdout from both success and "failure" paths.
 */
export async function pnpmAudit(cwd: string): Promise<AuditResult> {
	logger.debug('pnpm', `Running: pnpm audit --json in ${cwd}`)

	let stdout: string

	try {
		const result = await execFileAsync('pnpm', ['audit', '--json'], {
			cwd,
			maxBuffer: MAX_BUFFER,
			timeout: AUDIT_TIMEOUT,
		})
		stdout = result.stdout
	} catch (error: unknown) {
		const execError = error as ExecError
		if (execError.stdout) {
			stdout = execError.stdout
		} else {
			throw new Error(`pnpm audit failed: ${execError.message}`)
		}
	}

	const raw = JSON.parse(stdout) as unknown
	const result = parseAuditOutput(raw)

	logger.debug(
		'pnpm',
		`Audit found ${result.vulnerabilityCount} vulnerability(s), ${result.allSecurityIds.size} unique ID(s)`,
	)

	return result
}

export async function pnpmInstallLockfileOnly(
	cwd: string,
): Promise<{ isSuccess: boolean; error?: string }> {
	logger.debug('pnpm', `Running: pnpm install --lockfile-only --ignore-scripts in ${cwd}`)

	try {
		await execFileAsync('pnpm', ['install', '--lockfile-only', '--ignore-scripts'], {
			cwd,
			maxBuffer: MAX_BUFFER,
			timeout: INSTALL_TIMEOUT,
		})
		logger.debug('pnpm', 'Install succeeded')
		return { isSuccess: true }
	} catch (error: unknown) {
		const execError = error as ExecError
		const errorMsg = execError.stderr || execError.message
		logger.debug('pnpm', `Install failed: ${errorMsg.slice(0, 500)}`)
		return { isSuccess: false, error: errorMsg }
	}
}
