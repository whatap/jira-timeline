import { CheckCircle2, XCircle } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Progress,
} from '@/6_shared/shadcn';

import type { ValidationProgress, ValidationResult } from './util/validateUsers';

type ImportProgressDialogProps = {
  open: boolean;
  progress: ValidationProgress | null;
  result: ValidationResult | null;
  onClose: () => void;
  onCancel: () => void;
};

function ImportProgressDialog({
  open,
  progress,
  result,
  onClose,
  onCancel,
}: ImportProgressDialogProps) {
  const isCompleted = result !== null;
  const progressPercent = progress ? (progress.current / progress.total) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isCompleted ? '가져오기 완료' : '사용자 검증 중'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {!isCompleted && progress && (
            <>
              <div className="text-sm text-muted-foreground">
                검증 중... ({progress.current}/{progress.total})
              </div>
              <Progress value={progressPercent} className="h-2" />
              <div className="text-sm text-muted-foreground truncate" title={progress.currentUserId}>
                현재: {progress.currentUserId}
              </div>
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  성공: {progress.successCount}명
                </span>
                <span className="flex items-center gap-1 text-red-500">
                  <XCircle className="h-4 w-4" />
                  실패: {progress.failedCount}명
                </span>
              </div>
            </>
          )}

          {isCompleted && result && (
            <>
              <div className="text-sm">
                총 {result.validUsers.length + result.failedIds.length}명 중{' '}
                <span className="font-medium">{result.validUsers.length}명</span> 등록 완료
              </div>
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  성공: {result.validUsers.length}명
                </span>
                <span className="flex items-center gap-1 text-red-500">
                  <XCircle className="h-4 w-4" />
                  실패: {result.failedIds.length}명
                </span>
              </div>
              {result.failedIds.length > 0 && (
                <div className="text-sm">
                  <div className="text-muted-foreground mb-1">실패한 ID:</div>
                  <ul className="list-disc list-inside max-h-32 overflow-y-auto text-red-500">
                    {result.failedIds.map((id) => (
                      <li key={id} className="truncate" title={id}>
                        {id}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          {!isCompleted ? (
            <Button variant="secondary" onClick={onCancel}>
              취소
            </Button>
          ) : (
            <Button onClick={onClose}>확인</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ImportProgressDialog;
