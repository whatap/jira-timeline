import { Upload } from 'lucide-react';

import type { JiraUser } from '@/5_entities/user';
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@/6_shared/shadcn';

import { exportUsersToJson } from './util/exportUsersToJson';

type ExportUsersButtonProps = {
  users: JiraUser[];
};

function ExportUsersButton({ users }: ExportUsersButtonProps) {
  const handleExport = () => {
    if (users.length === 0) {
      return;
    }
    exportUsersToJson(users);
  };

  return (
    <Tooltip delayDuration={50}>
      <TooltipTrigger asChild>
        <Button variant='outline' size='sm' onClick={handleExport} disabled={users.length === 0}>
          <Upload className='h-4 w-4' />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>사용자 목록 내보내기</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default ExportUsersButton;
