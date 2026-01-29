import { describe, expect, it, vi } from 'vitest';

import { createExportData, createFilename } from '../util/exportUsersToJson';

describe('createExportData', () => {
  it('should convert JiraUser array to ExportData format', () => {
    const users = [
      { id: 'abc123', displayName: '홍길동', isVerified: true },
      { id: 'def456', displayName: '김철수', isVerified: true },
    ];

    const result = createExportData(users);

    expect(result.version).toBe(1);
    expect(result.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(result.users).toEqual([
      { id: 'abc123', displayName: '홍길동' },
      { id: 'def456', displayName: '김철수' },
    ]);
  });

  it('should handle users without displayName', () => {
    const users = [
      { id: 'abc123', displayName: undefined, isVerified: false },
    ];

    const result = createExportData(users);

    expect(result.users).toEqual([
      { id: 'abc123', displayName: undefined },
    ]);
  });

  it('should handle empty users array', () => {
    const result = createExportData([]);

    expect(result.version).toBe(1);
    expect(result.users).toEqual([]);
  });

  it('should exclude isVerified field from export', () => {
    const users = [
      { id: 'abc123', displayName: '홍길동', isVerified: true },
    ];

    const result = createExportData(users);

    expect(result.users[0]).not.toHaveProperty('isVerified');
  });
});

describe('createFilename', () => {
  it('should return filename with current date in YYYY-MM-DD format', () => {
    const mockDate = new Date('2024-01-29T12:00:00.000Z');
    vi.setSystemTime(mockDate);

    const result = createFilename();

    expect(result).toBe('jira-users-2024-01-29.json');

    vi.useRealTimers();
  });

  it('should pad month and day with leading zeros', () => {
    const mockDate = new Date('2024-03-05T12:00:00.000Z');
    vi.setSystemTime(mockDate);

    const result = createFilename();

    expect(result).toBe('jira-users-2024-03-05.json');

    vi.useRealTimers();
  });
});
