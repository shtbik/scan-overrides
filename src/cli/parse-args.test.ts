import { parseArgs } from './parse-args'

describe('parseArgs', () => {
	it('returns defaults when no arguments provided', () => {
		const result = parseArgs(['node', 'index.js'])
		expect(result.isJson).toBe(false)
		expect(result.isDebug).toBe(false)
		expect(result.isFix).toBe(false)
		expect(result.filter).toEqual([])
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

	it('parses --fix flag', () => {
		const result = parseArgs(['node', 'index.js', '--fix'])
		expect(result.isFix).toBe(true)
	})

	it('parses a single --filter value', () => {
		const result = parseArgs(['node', 'index.js', '--filter', 'semver'])
		expect(result.filter).toEqual(['semver'])
	})

	it('parses comma-separated --filter values', () => {
		const result = parseArgs(['node', 'index.js', '--filter', 'semver,qs'])
		expect(result.filter).toEqual(['semver', 'qs'])
	})

	it('trims whitespace around comma-separated values', () => {
		const result = parseArgs(['node', 'index.js', '--filter', 'semver , qs'])
		expect(result.filter).toEqual(['semver', 'qs'])
	})

	it('ignores empty segments from trailing commas', () => {
		const result = parseArgs(['node', 'index.js', '--filter', 'semver,'])
		expect(result.filter).toEqual(['semver'])
	})

	it('parses scoped nested override keys with --filter', () => {
		const result = parseArgs([
			'node',
			'index.js',
			'--filter',
			'@vercel/gatsby-plugin-vercel-builder>esbuild',
		])
		expect(result.filter).toEqual(['@vercel/gatsby-plugin-vercel-builder>esbuild'])
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
			'--fix',
			'--filter',
			'qs,semver',
			'--cwd',
			'/tmp/test',
		])
		expect(result.isJson).toBe(true)
		expect(result.isDebug).toBe(true)
		expect(result.isFix).toBe(true)
		expect(result.filter).toEqual(['qs', 'semver'])
		expect(result.projectDir).toBe('/tmp/test')
	})

	it('ignores --filter without a following value at end of args', () => {
		const result = parseArgs(['node', 'index.js', '--filter'])
		expect(result.filter).toEqual([])
	})

	it('ignores --cwd without a following value at end of args', () => {
		const result = parseArgs(['node', 'index.js', '--cwd'])
		expect(result.projectDir).toBe(process.cwd())
	})
})
