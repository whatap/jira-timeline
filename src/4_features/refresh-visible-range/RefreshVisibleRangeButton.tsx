import { Loader2, RefreshCw } from 'lucide-react';

import { Button } from '@/6_shared/shadcn/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/6_shared/shadcn/ui/tooltip';

type RefreshVisibleRangeButtonProps = {
  onRefresh: () => void;
  isLoading: boolean;
  disabled?: boolean;
};

function RefreshVisibleRangeButton({ onRefresh, isLoading, disabled = false }: RefreshVisibleRangeButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className='fixed bottom-6 right-6 rounded-full shadow-lg z-10'
            size='icon'
            onClick={onRefresh}
            disabled={isLoading || disabled}
          >
            {isLoading ? <Loader2 className='h-5 w-5 animate-spin' /> : <RefreshCw className='h-5 w-5' />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side='left'>
          <p>현재 구간 새로고침</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default RefreshVisibleRangeButton;
