type ParseSuccess = {
  success: true;
  userIds: string[];
};

type ParseError = {
  success: false;
  error: string;
};

export type ParseResult = ParseSuccess | ParseError;

type ExportFormat = {
  version?: number;
  users: Array<{ id: string; displayName?: string } | string>;
};

function isExportFormat(data: unknown): data is ExportFormat {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return Array.isArray(obj.users);
}

function isStringArray(data: unknown): data is string[] {
  return Array.isArray(data) && data.every((item) => typeof item === 'string');
}

function extractUserIds(users: Array<{ id: string; displayName?: string } | string>): string[] {
  return users.map((user) => {
    if (typeof user === 'string') {
      return user;
    }
    return user.id;
  });
}

export function parseUsersJson(jsonString: string): ParseResult {
  let data: unknown;

  try {
    data = JSON.parse(jsonString);
  } catch {
    return { success: false, error: '올바른 JSON 형식이 아닙니다' };
  }

  let userIds: string[];

  if (isExportFormat(data)) {
    userIds = extractUserIds(data.users);
  } else if (isStringArray(data)) {
    userIds = data;
  } else {
    return { success: false, error: '지원하지 않는 파일 형식입니다' };
  }

  const validIds = userIds
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  const uniqueIds = [...new Set(validIds)];

  if (uniqueIds.length === 0) {
    return { success: false, error: '유효한 사용자 ID가 없습니다' };
  }

  return { success: true, userIds: uniqueIds };
}
