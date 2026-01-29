import { type Version3Client } from 'jira.js';
import { describe, expect, it, vi } from 'vitest';

import { validateUsers } from '../util/validateUsers';

vi.mock('@/5_entities/jira', () => ({
  getJiraUser: vi.fn(),
}));

import { getJiraUser } from '@/5_entities/jira';

const mockGetJiraUser = vi.mocked(getJiraUser);

describe('validateUsers', () => {
  const mockClient = {} as Version3Client;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate users and return valid users', async () => {
    mockGetJiraUser
      .mockResolvedValueOnce({ accountId: 'abc123', displayName: '홍길동' })
      .mockResolvedValueOnce({ accountId: 'def456', displayName: '김철수' });

    const result = await validateUsers(mockClient, ['abc123', 'def456'], []);

    expect(result.validUsers).toHaveLength(2);
    expect(result.validUsers[0]).toEqual({
      id: 'abc123',
      displayName: '홍길동',
      isVerified: true,
    });
    expect(result.failedIds).toHaveLength(0);
  });

  it('should collect failed IDs', async () => {
    mockGetJiraUser
      .mockResolvedValueOnce({ accountId: 'abc123', displayName: '홍길동' })
      .mockResolvedValueOnce(null);

    const result = await validateUsers(mockClient, ['abc123', 'invalid-id'], []);

    expect(result.validUsers).toHaveLength(1);
    expect(result.failedIds).toEqual(['invalid-id']);
  });

  it('should use cached users instead of API call', async () => {
    const existingUsers = [
      { id: 'abc123', displayName: '홍길동', isVerified: true },
    ];

    mockGetJiraUser.mockResolvedValueOnce({ accountId: 'def456', displayName: '김철수' });

    const result = await validateUsers(mockClient, ['abc123', 'def456'], existingUsers);

    expect(mockGetJiraUser).toHaveBeenCalledTimes(1);
    expect(mockGetJiraUser).toHaveBeenCalledWith(mockClient, 'def456');
    expect(result.validUsers).toHaveLength(2);
  });

  it('should not use unverified users from cache', async () => {
    const existingUsers = [
      { id: 'abc123', displayName: undefined, isVerified: false },
    ];

    mockGetJiraUser.mockResolvedValueOnce({ accountId: 'abc123', displayName: '홍길동' });

    const result = await validateUsers(mockClient, ['abc123'], existingUsers);

    expect(mockGetJiraUser).toHaveBeenCalledTimes(1);
    expect(result.validUsers[0].displayName).toBe('홍길동');
  });

  it('should call onProgress callback', async () => {
    mockGetJiraUser
      .mockResolvedValueOnce({ accountId: 'abc123', displayName: '홍길동' })
      .mockResolvedValueOnce({ accountId: 'def456', displayName: '김철수' });

    const onProgress = vi.fn();

    await validateUsers(mockClient, ['abc123', 'def456'], [], onProgress);

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenNthCalledWith(1, {
      current: 1,
      total: 2,
      successCount: 0,
      failedCount: 0,
      currentUserId: 'abc123',
    });
    expect(onProgress).toHaveBeenNthCalledWith(2, {
      current: 2,
      total: 2,
      successCount: 1,
      failedCount: 0,
      currentUserId: 'def456',
    });
  });

  it('should stop when aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    mockGetJiraUser.mockResolvedValue({ accountId: 'abc123', displayName: '홍길동' });

    const result = await validateUsers(
      mockClient,
      ['abc123', 'def456'],
      [],
      undefined,
      controller.signal,
    );

    expect(mockGetJiraUser).not.toHaveBeenCalled();
    expect(result.validUsers).toHaveLength(0);
  });

  it('should handle empty userIds array', async () => {
    const result = await validateUsers(mockClient, [], []);

    expect(result.validUsers).toHaveLength(0);
    expect(result.failedIds).toHaveLength(0);
  });
});
