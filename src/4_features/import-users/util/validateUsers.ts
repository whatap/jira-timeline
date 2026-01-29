import { type Version3Client } from 'jira.js';

import { getJiraUser } from '@/5_entities/jira';
import { type JiraUser } from '@/5_entities/user';

export type ValidationProgress = {
  current: number;
  total: number;
  successCount: number;
  failedCount: number;
  currentUserId: string;
};

export type ValidationResult = {
  validUsers: JiraUser[];
  failedIds: string[];
};

export async function validateUsers(
  client: Version3Client,
  userIds: string[],
  existingUsers: JiraUser[],
  onProgress?: (progress: ValidationProgress) => void,
  signal?: AbortSignal,
): Promise<ValidationResult> {
  const validUsers: JiraUser[] = [];
  const failedIds: string[] = [];

  const existingVerifiedMap = new Map<string, JiraUser>();
  existingUsers.forEach((user) => {
    if (user.isVerified) {
      existingVerifiedMap.set(user.id, user);
    }
  });

  for (let i = 0; i < userIds.length; i++) {
    if (signal?.aborted) {
      break;
    }

    const userId = userIds[i];

    onProgress?.({
      current: i + 1,
      total: userIds.length,
      successCount: validUsers.length,
      failedCount: failedIds.length,
      currentUserId: userId,
    });

    const existingUser = existingVerifiedMap.get(userId);
    if (existingUser) {
      validUsers.push(existingUser);
      continue;
    }

    const userInfo = await getJiraUser(client, userId);

    if (userInfo) {
      validUsers.push({
        id: userInfo.accountId,
        displayName: userInfo.displayName,
        isVerified: true,
      });
    } else {
      failedIds.push(userId);
    }
  }

  return { validUsers, failedIds };
}
