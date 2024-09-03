import { useEffect } from 'react';

import { useClientStore } from '@/5_entities/jira';

import { useAuthStore } from './authStore';
import { exchangeAuthCodeForAccessToken, getAccessibleResources, parseOauthCodeBySelf } from './oauth';

export function useInitToken() {
  const { accessToken, setAccessToken, setCloudId } = useAuthStore();
  const { initClient } = useClientStore();

  useEffect(() => {
    if (accessToken) {
      return;
    }

    const { code } = parseOauthCodeBySelf();

    if (!code) {
      return;
    }

    (async () => {
      const { access_token: accessToken } = await exchangeAuthCodeForAccessToken(code);
      const { id: cloudId } = (await getAccessibleResources(accessToken))[0];

      console.log('accessToken', accessToken);
      console.log('cloudId', cloudId);
      getAccessibleResources(accessToken);
      setAccessToken(accessToken);
      setCloudId(cloudId);
      initClient(accessToken, cloudId);
    })();
  }, [accessToken, initClient, setAccessToken, setCloudId]);
}
