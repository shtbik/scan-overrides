import { formatDuration } from './report'

describe('formatDuration', () => {
	it('formats sub-second durations in milliseconds', () => {
		expect(formatDuration(42)).toBe('42ms')
		expect(formatDuration(999)).toBe('999ms')
	})

	it('formats seconds with one decimal', () => {
		expect(formatDuration(1000)).toBe('1.0s')
		expect(formatDuration(1500)).toBe('1.5s')
		expect(formatDuration(59999)).toBe('60.0s')
	})

	it('formats minutes and seconds', () => {
		expect(formatDuration(60_000)).toBe('1m 0s')
		expect(formatDuration(90_000)).toBe('1m 30s')
		expect(formatDuration(125_000)).toBe('2m 5s')
	})

	it('handles zero', () => {
		expect(formatDuration(0)).toBe('0ms')
	})
})
