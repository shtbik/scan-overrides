import { mkdir, rm, cp, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { logger } from '../util/logger'

export type TempWorkspace = {
	path: string
	cleanup: () => Promise<void>
	restoreOriginals: () => Promise<void>
}

const EXTRA_DIRS_TO_COPY = ['patches']

export async function createTempWorkspace(sourceDir: string): Promise<TempWorkspace> {
	const workspacePath = join(tmpdir(), `scan-overrides-${randomUUID()}`)

	logger.debug('workspace', `Creating temp workspace at ${workspacePath}`)

	await mkdir(workspacePath, { recursive: true })
	await cp(join(sourceDir, 'package.json'), join(workspacePath, 'package.json'))

	const hasLockfile = existsSync(join(sourceDir, 'pnpm-lock.yaml'))
	if (hasLockfile) {
		await cp(join(sourceDir, 'pnpm-lock.yaml'), join(workspacePath, 'pnpm-lock.yaml'))
	}

	if (existsSync(join(sourceDir, '.npmrc'))) {
		await cp(join(sourceDir, '.npmrc'), join(workspacePath, '.npmrc'))
	}

	for (const dir of EXTRA_DIRS_TO_COPY) {
		const srcPath = join(sourceDir, dir)
		if (existsSync(srcPath)) {
			await cp(srcPath, join(workspacePath, dir), { recursive: true })
		}
	}

	const originalPackageJson = await readFile(join(workspacePath, 'package.json'), 'utf-8')
	const originalLockfile = hasLockfile
		? await readFile(join(workspacePath, 'pnpm-lock.yaml'), 'utf-8')
		: null

	logger.debug('workspace', `Workspace ready (lockfile: ${hasLockfile ? 'yes' : 'no'})`)

	return {
		path: workspacePath,

		cleanup: async () => {
			logger.debug('workspace', `Cleaning up ${workspacePath}`)
			await rm(workspacePath, { recursive: true, force: true }).catch(() => {})
		},

		restoreOriginals: async () => {
			await writeFile(join(workspacePath, 'package.json'), originalPackageJson)
			if (originalLockfile !== null) {
				await writeFile(join(workspacePath, 'pnpm-lock.yaml'), originalLockfile)
			}
		},
	}
}

export async function removeOverrideFromPackageJson(
	dir: string,
	overrideKey: string,
): Promise<void> {
	const packageJsonPath = join(dir, 'package.json')
	const content = await readFile(packageJsonPath, 'utf-8')
	const packageJson = JSON.parse(content) as Record<string, unknown>

	const pnpm = packageJson.pnpm as Record<string, unknown> | undefined
	if (!pnpm?.overrides) return

	const overrides = { ...(pnpm.overrides as Record<string, string>) }
	delete overrides[overrideKey]

	packageJson.pnpm = { ...pnpm, overrides }

	const indentMatch = /\n(\s+)"/.exec(content)
	const indent = indentMatch?.[1] ?? '\t'
	await writeFile(packageJsonPath, JSON.stringify(packageJson, null, indent) + '\n')

	logger.debug('workspace', `Removed override "${overrideKey}" from package.json`)
}

export async function removeOverridesFromProject(
	projectDir: string,
	keys: string[],
): Promise<void> {
	if (keys.length === 0) return

	const packageJsonPath = join(projectDir, 'package.json')
	const content = await readFile(packageJsonPath, 'utf-8')
	const packageJson = JSON.parse(content) as Record<string, unknown>

	const pnpm = packageJson.pnpm as Record<string, unknown> | undefined
	if (!pnpm) return

	const keysToRemove = new Set(keys)

	if (pnpm.overrides && typeof pnpm.overrides === 'object') {
		const overrides = { ...(pnpm.overrides as Record<string, string>) }
		for (const key of keysToRemove) delete overrides[key]
		pnpm.overrides = overrides
	}

	if (pnpm.overrideNotes && typeof pnpm.overrideNotes === 'object') {
		const notes = { ...(pnpm.overrideNotes as Record<string, string>) }
		for (const key of keysToRemove) delete notes[key]
		pnpm.overrideNotes = notes
	}

	packageJson.pnpm = pnpm

	const indentMatch = /\n(\s+)"/.exec(content)
	const indent = indentMatch?.[1] ?? '\t'
	await writeFile(packageJsonPath, JSON.stringify(packageJson, null, indent) + '\n')

	logger.debug('cleanup', `Removed ${keys.length} override(s) from ${packageJsonPath}`)
}
