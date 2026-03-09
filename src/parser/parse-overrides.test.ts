import { vol } from 'memfs'
import { parseOverrides } from './parse-overrides'

jest.mock('node:fs/promises', () => {
	const memfs = jest.requireActual<typeof import('memfs')>('memfs')
	return memfs.fs.promises
})

beforeEach(() => {
	vol.reset()
})

function writePackageJson(
	dir: string,
	overrides: Record<string, string>,
	overrideNotes: Record<string, string> = {},
): void {
	vol.mkdirSync(dir, { recursive: true })
	vol.writeFileSync(
		`${dir}/package.json`,
		JSON.stringify({ pnpm: { overrides, overrideNotes } }),
	)
}

describe('parseOverrides', () => {
	it('returns overrides that have CVE in their notes', async () => {
		writePackageJson(
			'/project',
			{ semver: '^7.7.2', qs: '>=6.14.2' },
			{
				semver: 'Fix CVE-2024-55565',
				qs: 'Fix CVE-2025-15284',
			},
		)

		const result = await parseOverrides('/project')
		expect(result.overrides).toHaveLength(2)
		expect(result.overrides[0].key).toBe('semver')
		expect(result.overrides[0].securityIds).toEqual(['CVE-2024-55565'])
		expect(result.overrides[1].key).toBe('qs')
		expect(result.skipped).toHaveLength(0)
	})

	it('skips overrides without security IDs in notes', async () => {
		writePackageJson(
			'/project',
			{
				'@types/react': '19.2.2',
				semver: '^7.7.2',
			},
			{
				'@types/react': 'Pinned for React 19 compatibility',
				semver: 'Fix CVE-2024-55565',
			},
		)

		const result = await parseOverrides('/project')
		expect(result.overrides).toHaveLength(1)
		expect(result.overrides[0].key).toBe('semver')
		expect(result.skipped).toHaveLength(1)
		expect(result.skipped[0].key).toBe('@types/react')
	})

	it('skips overrides without any notes', async () => {
		writePackageJson('/project', { '@types/react-dom': '19.2.2' })

		const result = await parseOverrides('/project')
		expect(result.overrides).toHaveLength(0)
		expect(result.skipped).toHaveLength(1)
	})

	it('filters to --only keys when provided', async () => {
		writePackageJson(
			'/project',
			{ semver: '^7.7.2', qs: '>=6.14.2' },
			{
				semver: 'Fix CVE-2024-55565',
				qs: 'Fix CVE-2025-15284',
			},
		)

		const result = await parseOverrides('/project', ['qs'])
		expect(result.overrides).toHaveLength(1)
		expect(result.overrides[0].key).toBe('qs')
		expect(result.skipped).toHaveLength(1)
	})

	it('handles empty pnpm.overrides', async () => {
		vol.mkdirSync('/project', { recursive: true })
		vol.writeFileSync('/project/package.json', JSON.stringify({ pnpm: {} }))

		const result = await parseOverrides('/project')
		expect(result.overrides).toHaveLength(0)
		expect(result.skipped).toHaveLength(0)
	})

	it('handles missing pnpm field', async () => {
		vol.mkdirSync('/project', { recursive: true })
		vol.writeFileSync('/project/package.json', JSON.stringify({}))

		const result = await parseOverrides('/project')
		expect(result.overrides).toHaveLength(0)
	})
})
