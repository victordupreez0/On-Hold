import { hoursSince, timeAgo } from './ui';

const NOW = new Date('2026-10-14T12:00:00.000Z');

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

const minutesAgo = (mins: number) => new Date(NOW.getTime() - mins * 60_000).toISOString();

describe('hoursSince', () => {
  it('returns the elapsed hours between then and now', () => {
    expect(hoursSince(minutesAgo(120))).toBeCloseTo(2, 5);
  });

  it('is negative for a timestamp in the future', () => {
    expect(hoursSince(new Date(NOW.getTime() + 3_600_000).toISOString())).toBeCloseTo(-1, 5);
  });
});

describe('timeAgo', () => {
  it('says "just now" for under a minute', () => {
    expect(timeAgo(minutesAgo(0))).toBe('just now');
  });

  it('shows minutes under an hour', () => {
    expect(timeAgo(minutesAgo(5))).toBe('5 min ago');
  });

  it('shows hours under a day', () => {
    expect(timeAgo(minutesAgo(3 * 60))).toBe('3 h ago');
  });

  it('says "yesterday" for exactly one day', () => {
    expect(timeAgo(minutesAgo(24 * 60))).toBe('yesterday');
  });

  it('shows days beyond that', () => {
    expect(timeAgo(minutesAgo(5 * 24 * 60))).toBe('5 days ago');
  });
});
