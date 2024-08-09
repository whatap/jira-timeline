import { Version3Client } from 'jira.js';

const token = window.localStorage.getItem('jira-api-key') ?? '';
const userIdList = JSON.parse(window.localStorage.getItem('user-json') ?? '[]');

const client = new Version3Client({
  // host: "https://whatap-labs.atlassian.net",
  host: 'http://localhost:3333',
  authentication: {
    basic: {
      email: 'dongkyun@whatap.io',
      apiToken: token,
    },
  },
});

export async function getIssues() {
  return await client.issueSearch.searchForIssuesUsingJql({
    jql: `assignee IN (${userIdList.join(', ')}) AND "예정된 시작 날짜[date]" IS NOT EMPTY`, // AND status IN ("In Review", "In Progress", Preview, QA, Re-Opened, "To Do", "WAITING DEPLOY")`,
    fields: ['assignee', 'creator', 'summary', 'issueType', 'status', 'customfield_10156', 'customfield_10157'],
    maxResults: 100,
  });
}
