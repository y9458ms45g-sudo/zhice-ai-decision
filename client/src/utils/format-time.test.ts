import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { formatRelativeTime, formatDueDate } from './format-time';

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('刚刚（小于60秒）', () => {
    expect(formatRelativeTime(new Date('2026-01-15T11:59:30Z'))).toBe('刚刚');
    expect(formatRelativeTime(new Date('2026-01-15T12:00:00Z'))).toBe('刚刚');
  });

  it('分钟前', () => {
    expect(formatRelativeTime(new Date('2026-01-15T11:55:00Z'))).toBe('5分钟前');
    expect(formatRelativeTime(new Date('2026-01-15T11:01:00Z'))).toBe('59分钟前');
  });

  it('小时前', () => {
    expect(formatRelativeTime(new Date('2026-01-15T10:00:00Z'))).toBe('2小时前');
    expect(formatRelativeTime(new Date('2026-01-15T00:00:00Z'))).toBe('12小时前');
  });

  it('天前', () => {
    expect(formatRelativeTime(new Date('2026-01-14T12:00:00Z'))).toBe('1天前');
    expect(formatRelativeTime(new Date('2026-01-12T12:00:00Z'))).toBe('3天前');
    expect(formatRelativeTime(new Date('2026-01-09T12:00:00Z'))).toBe('6天前');
  });

  it('周前', () => {
    expect(formatRelativeTime(new Date('2026-01-08T12:00:00Z'))).toBe('1周前');
    expect(formatRelativeTime(new Date('2025-12-25T12:00:00Z'))).toBe('3周前');
    expect(formatRelativeTime(new Date('2025-12-18T12:00:00Z'))).toBe('4周前');
  });

  it('个月前', () => {
    expect(formatRelativeTime(new Date('2025-12-10T12:00:00Z'))).toBe('1个月前');
    expect(formatRelativeTime(new Date('2025-07-15T12:00:00Z'))).toBe('6个月前');
    expect(formatRelativeTime(new Date('2025-02-20T12:00:00Z'))).toBe('10个月前');
  });

  it('年前', () => {
    expect(formatRelativeTime(new Date('2025-01-15T12:00:00Z'))).toBe('1年前');
    expect(formatRelativeTime(new Date('2024-01-15T12:00:00Z'))).toBe('2年前');
  });

  it('未来时间返回刚刚', () => {
    expect(formatRelativeTime(new Date('2026-01-16T12:00:00Z'))).toBe('刚刚');
  });

  it('支持字符串和时间戳输入', () => {
    expect(formatRelativeTime('2026-01-15T11:55:00Z')).toBe('5分钟前');
    expect(formatRelativeTime(new Date('2026-01-15T11:55:00Z').getTime())).toBe('5分钟前');
  });
});

describe('formatDueDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('空值返回空字符串', () => {
    expect(formatDueDate(null)).toBe('');
  });

  it('今天', () => {
    expect(formatDueDate('2026-01-15')).toBe('今天');
  });

  it('明天', () => {
    expect(formatDueDate('2026-01-16')).toBe('明天');
  });

  it('昨天', () => {
    expect(formatDueDate('2026-01-14')).toBe('昨天');
  });

  it('逾期', () => {
    expect(formatDueDate('2026-01-10')).toBe('已逾期5天');
    expect(formatDueDate('2026-01-13')).toBe('已逾期2天');
  });

  it('7天内显示几天后', () => {
    expect(formatDueDate('2026-01-17')).toBe('2天后');
    expect(formatDueDate('2026-01-22')).toBe('7天后');
  });

  it('超过7天显示月日', () => {
    expect(formatDueDate('2026-01-23')).toBe('1月23日');
    expect(formatDueDate('2026-12-25')).toBe('12月25日');
  });
});
