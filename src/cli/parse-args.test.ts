import { parseArgs } from './parse-args'

describe('parseArgs', () => {
	it('returns defaults when no arguments provided', () => {
		const result = parseArgs(['node', 'index.js'])
		expect(result.isJson).toBe(false)
		expect(result.isDebug).toBe(false)
		expect(result.only).toEqual([])
		expect(result.projectDir).toBe(process.cwd())
	})

	it('parses --json flag', () => {
		const result = parseArgs(['node', 'index.js', '--json'])
		expect(result.isJson).toBe(true)
	})

	it('parses --debug flag', () => {
		const result = parseArgs(['node', 'index.js', '--debug'])
		expect(result.isDebug).toBe(true)
	})

	it('parses a single --only value', () => {
		const result = parseArgs(['node', 'index.js', '--only', 'semver'])
		expect(result.only).toEqual(['semver'])
	})

	it('parses multiple --only values', () => {
		const result = parseArgs(['node', 'index.js', '--only', 'semver', '--only', 'qs'])
		expect(result.only).toEqual(['semver', 'qs'])
	})

	it('parses scoped override keys with --only', () => {
		const result = parseArgs([
			'node',
			'index.js',
			'--only',
			'@vercel/gatsby-plugin-vercel-builder>esbuild',
		])
		expect(result.only).toEqual(['@vercel/gatsby-plugin-vercel-builder>esbuild'])
	})

	it('parses --cwd and resolves it', () => {
		const result = parseArgs(['node', 'index.js', '--cwd', '/tmp/my-project'])
		expect(result.projectDir).toBe('/tmp/my-project')
	})

	it('parses all flags together', () => {
		const result = parseArgs([
			'node',
			'index.js',
			'--json',
			'--debug',
			'--only',
			'qs',
			'--cwd',
			'/tmp/test',
		])
		expect(result.isJson).toBe(true)
		expect(result.isDebug).toBe(true)
		expect(result.only).toEqual(['qs'])
		expect(result.projectDir).toBe('/tmp/test')
	})

	it('ignores --only without a following value at end of args', () => {
		const result = parseArgs(['node', 'index.js', '--only'])
		expect(result.only).toEqual([])
	})

	it('ignores --cwd without a following value at end of args', () => {
		const result = parseArgs(['node', 'index.js', '--cwd'])
		expect(result.projectDir).toBe(process.cwd())
	})
})
