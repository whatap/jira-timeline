import { useCallback, useState } from 'react';

import { useClientStore } from '@/5_entities/jira/jiraClientStore';

import { useAuthStore } from './authStore';
import { refreshAccessToken } from './oauth';

type RefreshResult = {
  success: boolean;
  error?: string;
};

export function useRefreshToken() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { refreshToken, cloudId, setAccessToken, setRefreshToken, setExpiresAt } = useAuthStore();
  const { initClient } = useClientStore();

  const refresh = useCallback(async (): Promise<RefreshResult> => {
    if (!refreshToken) {
      return { success: false, error: '갱신 토큰이 없습니다.' };
    }

    if (isRefreshing) {
      return { success: false, error: '이미 갱신 중입니다.' };
    }

    setIsRefreshing(true);

    try {
      const {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        expires_in: expiresIn,
      } = await refreshAccessToken(refreshToken);

      const expiresAt = Date.now() + expiresIn * 1000;

      setAccessToken(newAccessToken);
      setRefreshToken(newRefreshToken);
      setExpiresAt(expiresAt);

      if (cloudId) {
        initClient(newAccessToken, cloudId);
      }

      return { success: true };
    } catch (err) {
      console.error('Token refresh failed:', err);
      return { success: false, error: '토큰 갱신에 실패했습니다.' };
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshToken, cloudId, isRefreshing, setAccessToken, setRefreshToken, setExpiresAt, initClient]);

  return {
    refresh,
    isRefreshing,
  };
}
