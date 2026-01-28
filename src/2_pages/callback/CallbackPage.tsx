import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/5_entities/auth';
import { exchangeAuthCodeForAccessToken, getAccessibleResources, getMyself, parseOauthCodeBySelf } from '@/5_entities/auth/oauth';
import { useClientStore } from '@/5_entities/jira/jiraClientStore';

function CallbackPage() {
  const { setAccessToken, setCloudId, setCurrentUser } = useAuthStore();
  const { initClient } = useClientStore();
  const navigate = useNavigate();

  useEffect(() => {
    const { code } = parseOauthCodeBySelf();

    if (!code) {
      navigate('/login', { replace: true });
      return;
    }

    (async () => {
      try {
        const { access_token: accessToken } = await exchangeAuthCodeForAccessToken(code);
        const { id: cloudId } = (await getAccessibleResources(accessToken))[0];

        setAccessToken(accessToken);
        setCloudId(cloudId);
        initClient(accessToken, cloudId);

        const currentUser = await getMyself(accessToken, cloudId);
        setCurrentUser(currentUser);

        navigate('/', { replace: true });
      } catch (error) {
        console.error('Login failed:', error);
        navigate('/login', { replace: true });
      }
    })();
  }, [navigate, setAccessToken, setCloudId, setCurrentUser, initClient]);

  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-gray-50'>
      <div className='text-center'>
        <h1 className='text-2xl font-semibold text-gray-900 mb-4'>로그인 중...</h1>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto' />
      </div>
    </div>
  );
}

export default CallbackPage;
