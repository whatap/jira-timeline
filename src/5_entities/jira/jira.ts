import { Version3Client } from 'jira.js';

import type { DateRange } from '@/6_shared/utils';

import { type DateSource, resolveDateSource } from './util/resolveDateSource';

// StatusCategory 타입 정의
export type StatusCategoryKey = 'new' | 'indeterminate' | 'done';

export interface StatusCategory {
  key: StatusCategoryKey;
  colorName: string;
  name: string;
}

// Issue 타입 정의
export interface Issue {
  key: string;
  userId: string; // 조회에 사용한 사용자 ID (userStore의 id)
  assigneeId: string;
  assignee: string;
  creator: string;
  summary: string;
  startTime: string; // YYYY-MM-DD
  endTime: string; // YYYY-MM-DD
  dateSource: DateSource;
  issueType?: string;
  status?: string;
  statusCategory?: StatusCategory;
  link: string;
}

// Jira API 응답 타입 (필요한 필드만 정의)
interface JiraIssueResponse {
  key: string;
  fields: {
    assignee?: { accountId?: string; displayName?: string } | null;
    creator?: { displayName?: string } | null;
    summary?: string | null;
    issuetype?: { name?: string } | null;
    status?: {
      name?: string;
      statusCategory?: {
        key?: string;
        colorName?: string;
        name?: string;
      };
    } | null;
    customfield_10156?: string | null; // 예정된 시작일
    customfield_10157?: string | null; // 예정된 종료일
    startDate?: string | null; // Start Date (표준 필드)
    duedate?: string | null; // 기한 (표준 필드)
  };
}

/**
 * userIdList를 localStorage에서 읽어옴
 * zustand persist 스토어 형식에서 users 배열의 id만 추출
 */
function getUserIdList(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem('jira-users');
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    const users = parsed?.state?.users ?? [];
    return users.map((u: { id: string }) => u.id);
  } catch {
    return [];
  }
}

/**
 * 날짜 범위에 해당하는 이슈를 조회
 * @param client Jira API 클라이언트
 * @param dateRange 조회할 날짜 범위
 * @returns 변환된 Issue 배열
 */
export async function getIssues(client: Version3Client, dateRange: DateRange): Promise<Issue[]> {
  const userIdList = getUserIdList();

  if (userIdList.length === 0) {
    return [];
  }

  const results = await Promise.all(
    userIdList.map(async (userId: string) => {
      const response = await client.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
        jql: `assignee IN (${userId}) AND (("예정된 시작 날짜[date]" IS NOT EMPTY AND customfield_10157 >= "${dateRange.start}" AND customfield_10157 <= "${dateRange.end}") OR (startDate IS NOT EMPTY AND due >= "${dateRange.start}" AND due <= "${dateRange.end}"))`,
        fields: ['assignee', 'creator', 'summary', 'issuetype', 'status', 'customfield_10156', 'customfield_10157', 'startDate', 'duedate'],
        maxResults: 200,
      });
      return { userId, issues: (response.issues as JiraIssueResponse[]) ?? [] };
    }),
  );

  // API 응답을 Issue 타입으로 변환 (userId 포함, 날짜 해석 불가 이슈 제외)
  const allIssues: Issue[] = [];
  results.forEach(({ userId, issues }) => {
    issues.forEach((issue) => {
      const resolved = resolveDateSource(issue.fields);
      if (!resolved) return;

      const statusCat = issue.fields.status?.statusCategory;
      allIssues.push({
        key: issue.key,
        userId,
        assigneeId: issue.fields.assignee?.accountId ?? '',
        assignee: issue.fields.assignee?.displayName ?? '',
        creator: issue.fields.creator?.displayName ?? '',
        summary: issue.fields.summary ?? '',
        startTime: resolved.startTime,
        endTime: resolved.endTime,
        dateSource: resolved.dateSource,
        issueType: issue.fields.issuetype?.name,
        status: issue.fields.status?.name,
        statusCategory: statusCat?.key
          ? {
              key: statusCat.key as StatusCategoryKey,
              colorName: statusCat.colorName ?? '',
              name: statusCat.name ?? '',
            }
          : undefined,
        link: `https://whatap-labs.atlassian.net/browse/${issue.key}`,
      });
    });
  });

  return allIssues;
}

export function createJiraClient(accessToken: string, cloudId: string) {
  return new Version3Client({
    host: import.meta.env.PROD
      ? `https://api.atlassian.com/ex/jira/${cloudId}`
      : `http://localhost:3333/ex/jira/${cloudId}`,
    authentication: {
      oauth2: {
        accessToken,
      },
    },
  });
}

export type JiraUserInfo = {
  accountId: string;
  displayName: string;
};

/**
 * Jira 사용자 정보를 조회
 * @param client Jira API 클라이언트
 * @param accountId 조회할 사용자의 accountId
 * @returns 사용자 정보 또는 null (조회 실패 시)
 */
export async function getJiraUser(client: Version3Client, accountId: string): Promise<JiraUserInfo | null> {
  try {
    const user = await client.users.getUser({ accountId });
    if (!user.accountId || !user.displayName) {
      return null;
    }
    return {
      accountId: user.accountId,
      displayName: user.displayName,
    };
  } catch {
    return null;
  }
}
