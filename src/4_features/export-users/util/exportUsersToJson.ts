import { type JiraUser } from '@/5_entities/user';

type ExportUser = {
  id: string;
  displayName?: string;
};

type ExportData = {
  version: 1;
  exportedAt: string;
  users: ExportUser[];
};

export function createExportData(users: JiraUser[]): ExportData {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    users: users.map((user) => ({
      id: user.id,
      displayName: user.displayName,
    })),
  };
}

export function createFilename(): string {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `jira-users-${yyyy}-${mm}-${dd}.json`;
}

export function downloadJson(data: ExportData, filename: string): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportUsersToJson(users: JiraUser[]): void {
  const data = createExportData(users);
  const filename = createFilename();
  downloadJson(data, filename);
}
