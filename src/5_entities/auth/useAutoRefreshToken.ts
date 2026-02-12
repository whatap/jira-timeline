import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useClientStore } from '@/5_entities/jira/jiraClientStore';

import { useAuthStore } from './authStore';
import { refreshAccessToken } from './oauth';

const AUTO_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5분 전
const RETRY_INTERVAL = 5 * 1000; // 5초
const MAX_RETRY_COUNT = 5;

export function useAutoRefreshToken() {
  const [isRefreshFailed, setIsRefreshFailed] = useState(false);

  const { expiresAt, refreshToken, cloudId, setAccessToken, setRefreshToken, setExpiresAt } =
    useAuthStore();
  const { initClient } = useClientStore();

  const isRefreshingRef = useRef(false);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<number | null>(null);
  const hasTriggeredRef = useRef(false);

  const clearRetryTimeout = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const doRefresh = useCallback(async (): Promise<boolean> => {
    if (!refreshToken) {
      return false;
    }

    if (isRefreshingRef.current) {
      return false;
    }

    isRefreshingRef.current = true;

    try {
      const {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        expires_in: expiresIn,
      } = await refreshAccessToken(refreshToken);

      const newExpiresAt = Date.now() + expiresIn * 1000;

      setAccessToken(newAccessToken);
      setRefreshToken(newRefreshToken);
      setExpiresAt(newExpiresAt);

      if (cloudId) {
        initClient(newAccessToken, cloudId);
      }

      retryCountRef.current = 0;
      hasTriggeredRef.current = false;
      toast.success('토큰이 갱신되었습니다.');
      return true;
    } catch (err) {
      console.error('Token refresh failed:', err);
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [refreshToken, cloudId, setAccessToken, setRefreshToken, setExpiresAt, initClient]);

  const attemptRefresh = useCallback(async () => {
    toast.loading('토큰 갱신 중...', { id: 'token-refresh' });

    const success = await doRefresh();

    if (success) {
      toast.dismiss('token-refresh');
      return;
    }

    retryCountRef.current += 1;

    if (retryCountRef.current >= MAX_RETRY_COUNT) {
      toast.dismiss('token-refresh');
      toast.error('토큰 갱신에 실패했습니다.');
      setIsRefreshFailed(true);
      return;
    }

    toast.loading(`토큰 갱신 중... (${retryCountRef.current}/${MAX_RETRY_COUNT})`, {
      id: 'token-refresh',
    });

    retryTimeoutRef.current = window.setTimeout(() => {
      attemptRefresh();
    }, RETRY_INTERVAL);
  }, [doRefresh]);

  useEffect(() => {
    if (!expiresAt) return;

    const checkAndRefresh = () => {
      const remaining = expiresAt - Date.now();

      if (remaining <= AUTO_REFRESH_THRESHOLD && !hasTriggeredRef.current && !isRefreshFailed) {
        hasTriggeredRef.current = true;
        retryCountRef.current = 0;
        attemptRefresh();
      }
    };

    checkAndRefresh();
    const intervalId = window.setInterval(checkAndRefresh, 1000);

    return () => {
      clearInterval(intervalId);
      clearRetryTimeout();
    };
  }, [expiresAt, attemptRefresh, clearRetryTimeout, isRefreshFailed]);

  const resetFailedState = useCallback(() => {
    setIsRefreshFailed(false);
    retryCountRef.current = 0;
    hasTriggeredRef.current = false;
  }, []);

  return {
    isRefreshFailed,
    resetFailedState,
  };
}
