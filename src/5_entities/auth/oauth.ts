import ky from 'ky';
import qs from 'query-string';

const CLIENT_ID = 't7bc3uWBBA32iaObqHLT3u9174lXN8YJ';
const REDIRECT_URI = import.meta.env.PROD
  ? 'https://whatap.github.io/jira-timeline/'
  : 'http://localhost:3333/jira-timeline';

export function getAuthorizationUrl() {
  return qs.stringifyUrl({
    url: 'https://auth.atlassian.com/authorize',
    query: {
      audience: 'api.atlassian.com',
      client_id: CLIENT_ID,
      scope: 'read:jira-work read:jira-user read:me',
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
  expires_in: number;
  scope: string;
  token_type: string;
}> {
  return await ky
    .post('https://auth.atlassian.com/oauth/token', {
      json: {
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: import.meta.env.VITE_JIRA_SECRET,
        code: authCode,
        redirect_uri: REDIRECT_URI,
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
