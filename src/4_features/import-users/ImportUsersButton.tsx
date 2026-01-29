import { Download } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { useClientStore } from '@/5_entities/jira';
import type { JiraUser } from '@/5_entities/user';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/6_shared/shadcn';

import ImportProgressDialog from './ImportProgressDialog';
import { parseUsersJson } from './util/parseUsersJson';
import { type ValidationProgress, type ValidationResult, validateUsers } from './util/validateUsers';

type ImportMode = 'merge' | 'replace';

type ImportUsersButtonProps = {
  currentUsers: JiraUser[];
  onImportComplete?: (users: JiraUser[]) => void;
};

function ImportUsersButton({ currentUsers, onImportComplete }: ImportUsersButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { client } = useClientStore();

  const [parsedUserIds, setParsedUserIds] = useState<string[]>([]);
  const [showModeDialog, setShowModeDialog] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ValidationProgress | null>(null);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = '';

    try {
      const text = await file.text();
      const parseResult = parseUsersJson(text);

      if (!parseResult.success) {
        setError(parseResult.error);
        return;
      }

      setParsedUserIds(parseResult.userIds);
      setShowModeDialog(true);
    } catch {
      setError('파일을 읽을 수 없습니다');
    }
  }, []);

  const handleStartImport = useCallback(async () => {
    if (!client) {
      setError('Jira 클라이언트가 초기화되지 않았습니다');
      return;
    }

    setShowModeDialog(false);
    setIsImporting(true);
    setProgress(null);
    setResult(null);

    abortControllerRef.current = new AbortController();

    const existingUsers = importMode === 'merge' ? currentUsers : [];

    const validationResult = await validateUsers(
      client,
      parsedUserIds,
      existingUsers,
      setProgress,
      abortControllerRef.current.signal,
    );

    if (abortControllerRef.current.signal.aborted) {
      setIsImporting(false);
      return;
    }

    setResult(validationResult);

    let newUsers: JiraUser[];

    if (importMode === 'merge') {
      const existingIds = new Set(currentUsers.map((u) => u.id));
      const newValidUsers = validationResult.validUsers.filter((u) => !existingIds.has(u.id));
      newUsers = [...currentUsers, ...newValidUsers];
    } else {
      newUsers = validationResult.validUsers;
    }

    onImportComplete?.(newUsers);
  }, [client, parsedUserIds, currentUsers, importMode, onImportComplete]);

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const handleCloseProgress = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsImporting(false);
  }, []);

  const handleCloseError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <>
      <input type='file' accept='.json' hidden ref={fileInputRef} onChange={handleFileSelect} />
      <Tooltip delayDuration={50}>
        <TooltipTrigger asChild>
          <Button variant='outline' size='sm' onClick={() => fileInputRef.current?.click()}>
            <Download className='h-4 w-4' />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>사용자 목록 가져오기</p>
        </TooltipContent>
      </Tooltip>

      <Dialog open={showModeDialog} onOpenChange={setShowModeDialog}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>가져오기 방식 선택</DialogTitle>
          </DialogHeader>

          <div className='flex flex-col gap-3 py-4'>
            <p className='text-sm text-muted-foreground'>{parsedUserIds.length}명의 사용자를 가져옵니다.</p>

            <div className='flex flex-col gap-2'>
              <Label className='flex items-start gap-2 cursor-pointer'>
                <input
                  type='radio'
                  name='importMode'
                  value='merge'
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                  className='mt-1'
                />
                <div>
                  <div className='font-medium'>병합</div>
                  <div className='text-sm text-muted-foreground'>기존 사용자 유지, 새 사용자만 추가</div>
                </div>
              </Label>

              <Label className='flex items-start gap-2 cursor-pointer'>
                <input
                  type='radio'
                  name='importMode'
                  value='replace'
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className='mt-1'
                />
                <div>
                  <div className='font-medium'>대체</div>
                  <div className='text-sm text-muted-foreground'>기존 사용자 삭제 후 교체</div>
                </div>
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant='secondary' onClick={() => setShowModeDialog(false)}>
              취소
            </Button>
            <Button onClick={handleStartImport}>확인</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportProgressDialog
        open={isImporting}
        progress={progress}
        result={result}
        onClose={handleCloseProgress}
        onCancel={handleCancel}
      />

      <Dialog open={error !== null} onOpenChange={(open) => !open && handleCloseError()}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>오류</DialogTitle>
          </DialogHeader>
          <div className='py-4 text-sm text-red-500'>{error}</div>
          <DialogFooter>
            <Button onClick={handleCloseError}>확인</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ImportUsersButton;
