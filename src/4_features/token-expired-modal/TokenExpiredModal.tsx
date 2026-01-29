import { useState } from 'react';

import { refreshAccessToken, useAuthStore } from '@/5_entities/auth';
import { useClientStore } from '@/5_entities/jira/jiraClientStore';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/6_shared/shadcn';

type TokenExpiredModalProps = {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
};

function TokenExpiredModal({ open, onClose, onLogout }: TokenExpiredModalProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { refreshToken, setAccessToken, setRefreshToken, setExpiresAt } = useAuthStore();
  const { cloudId } = useAuthStore();
  const { initClient } = useClientStore();

  const handleRefresh = async () => {
    if (!refreshToken) {
      setError('갱신 토큰이 없습니다. 다시 로그인해주세요.');
      return;
    }

    setIsRefreshing(true);
    setError(null);

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

      onClose();
    } catch (err) {
      console.error('Token refresh failed:', err);
      setError('토큰 갱신에 실패했습니다. 다시 로그인해주세요.');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>토큰 만료</DialogTitle>
          <DialogDescription>
            인증 토큰이 만료되었습니다. 토큰을 갱신하시겠습니까?
          </DialogDescription>
        </DialogHeader>

        {error && <p className='text-sm text-red-500'>{error}</p>}

        <DialogFooter>
          <Button variant='outline' onClick={onLogout} disabled={isRefreshing}>
            로그아웃
          </Button>
          <Button onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? '갱신 중...' : '토큰 갱신'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TokenExpiredModal;
