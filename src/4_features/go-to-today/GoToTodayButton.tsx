import { CalendarCheck } from 'lucide-react';

import { Button } from '@/6_shared/shadcn/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/6_shared/shadcn/ui/tooltip';

type GoToTodayButtonProps = {
  onGoToToday: () => void;
};

function GoToTodayButton({ onGoToToday }: GoToTodayButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={50}>
        <TooltipTrigger asChild>
          <Button
            className='fixed bottom-6 right-20 rounded-full shadow-lg z-10'
            size='icon'
            onClick={onGoToToday}
          >
            <CalendarCheck className='h-5 w-5' />
          </Button>
        </TooltipTrigger>
        <TooltipContent side='left'>
          <p>오늘 날짜로 이동</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default GoToTodayButton;
