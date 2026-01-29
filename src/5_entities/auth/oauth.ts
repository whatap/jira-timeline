import ky from 'ky';
import qs from 'query-string';

const CLIENT_ID = import.meta.env.VITE_JIRA_CLIENT_ID;
const SECRET = import.meta.env.VITE_JIRA_SECRET;
const REDIRECT_URI = import.meta.env.PROD
  ? 'https://whatap.github.io/jira-timeline/callback'
  : 'http://localhost:3333/jira-timeline/callback';

export function getAuthorizationUrl() {
  return qs.stringifyUrl({
    url: 'https://auth.atlassian.com/authorize',
    query: {
      audience: 'api.atlassian.com',
      client_id: CLIENT_ID,
      scope: 'read:jira-work read:jira-user read:me offline_access',
      redirect_uri: REDIRECT_URI,
      state: new Date().getTime().toString(),
      response_type: 'code',
      prompt: 'consent',
    },
  });
}

export function parseOauthCodeBySelf(): { code?: string; state?: string } {
  return qs.parse(location.search);
}

export async function exchangeAuthCodeForAccessToken(authCode: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}> {
  return await ky
    .post('https://auth.atlassian.com/oauth/token', {
      json: {
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: SECRET,
        code: authCode,
        redirect_uri: REDIRECT_URI,
      },
    })
    .json();
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}> {
  return await ky
    .post('https://auth.atlassian.com/oauth/token', {
      json: {
        grant_type: 'refresh_token',
        client_id: CLIENT_ID,
        client_secret: SECRET,
        refresh_token: refreshToken,
      },
    })
    .json();
}

export async function getAccessibleResources(accessToken: string): Promise<
  {
    id: string;
    name: string;
    url: string;
    scopes: string[];
    avatarUrl: string;
  }[]
> {
  return await ky
    .get('https://api.atlassian.com/oauth/token/accessible-resources', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    .json();
}

export type JiraCurrentUser = {
  accountId: string;
  accountType: string;
  displayName: string;
  emailAddress?: string;
  avatarUrls: {
    '48x48': string;
    '24x24': string;
    '16x16': string;
    '32x32': string;
  };
  active: boolean;
  timeZone: string;
  locale: string;
};

export async function getMyself(accessToken: string, cloudId: string): Promise<JiraCurrentUser> {
  return await ky
    .get(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/myself`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    .json();
}
