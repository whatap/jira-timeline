import { Version3Client } from 'jira.js';

const userIdList = JSON.parse(window.localStorage.getItem('user-json') ?? '[]');

export async function getIssues(client: Version3Client) {
  return (
    await Promise.all(
      (userIdList ?? []).map((id: string) =>
        client.issueSearch.searchForIssuesUsingJql({
          jql: `assignee IN (${id}) AND "예정된 시작 날짜[date]" IS NOT EMPTY`, // AND status IN ("In Review", "In Progress", Preview, QA, Re-Opened, "To Do", "WAITING DEPLOY")`,
          fields: ['assignee', 'creator', 'summary', 'issueType', 'status', 'customfield_10156', 'customfield_10157'],
          maxResults: 200,
        }),
      ),
    )
  ).reduce((acc, cur) => [...acc, ...cur.issues], []);
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
