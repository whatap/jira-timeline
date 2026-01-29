import { Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useAuthStore, useRefreshToken } from '@/5_entities/auth';
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/6_shared/shadcn';

function formatTime(ms: number): string {
  if (ms <= 0) return '00:00';

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function TokenCountdown({ onExpired }: { onExpired: () => void }) {
  const { expiresAt } = useAuthStore();
  const { refresh, isRefreshing } = useRefreshToken();
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!expiresAt) return;

    const updateRemainingTime = () => {
      const remaining = expiresAt - Date.now();
      setRemainingTime(remaining);

      if (remaining <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        onExpired();
      }
    };

    updateRemainingTime();
    intervalRef.current = window.setInterval(updateRemainingTime, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [expiresAt, onExpired]);

  if (!expiresAt) return null;

  const isWarning = remainingTime <= 5 * 60 * 1000; // 5분 이하
  const isExpired = remainingTime <= 0;

  const handleRefresh = async () => {
    await refresh();
  };

  return (
    <TooltipProvider delayDuration={50}>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={`text-sm font-mono cursor-help ${
                isExpired ? 'text-red-600' : isWarning ? 'text-orange-500' : 'text-gray-500'
              }`}
            >
              {formatTime(remainingTime)}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>세션 만료까지 남은 시간</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>토큰 갱신</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export default TokenCountdown;
