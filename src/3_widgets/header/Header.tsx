import { useState } from 'react';

import { TokenCountdown } from '@/4_features/token-countdown';
import { TokenExpiredModal } from '@/4_features/token-expired-modal';
import { UserRegisterModal } from '@/4_features/user-register-modal';
import { useAuth, useAuthStore } from '@/5_entities/auth';
import { useIssueStore } from '@/5_entities/jira';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/6_shared/shadcn';

function Header() {
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const { logout } = useAuth();
  const { currentUser } = useAuthStore();
  const { isLoading, error } = useIssueStore();

  const displayName = currentUser?.displayName ?? '사용자';
  const avatarUrl = currentUser?.avatarUrls?.['32x32'];
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className='flex items-center gap-2 p-2 border-b'>
      <UserRegisterModal />

      <TokenExpiredModal
        open={showExpiredModal}
        onClose={() => setShowExpiredModal(false)}
        onLogout={logout}
      />

      <div className='flex-1' />

      {isLoading() && <span className='text-sm text-blue-500'>로딩 중...</span>}
      {error && <span className='text-sm text-red-500'>{error}</span>}

      <TokenCountdown onExpired={() => setShowExpiredModal(true)} />

      <DropdownMenu>
        <DropdownMenuTrigger className='flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 cursor-pointer'>
          <Avatar className='h-8 w-8'>
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span className='text-sm'>{displayName}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuLabel>{currentUser?.emailAddress ?? displayName}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className='cursor-pointer'>
            로그아웃
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default Header;
